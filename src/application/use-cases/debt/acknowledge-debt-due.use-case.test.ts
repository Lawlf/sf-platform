import { describe, expect, it, vi } from "vitest";

import type { CreditCardDebt } from "@/domain/entities/debt.entity";
import type { DebtDueAcknowledgementEntity } from "@/domain/entities/debt-due-acknowledgement.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { acknowledgeDebtDue } from "./acknowledge-debt-due.use-case";

const clock: Clock = { now: () => new Date(2026, 5, 15) };

function makeStmt(): Money {
  return Money.fromCents(50000n);
}

function makeDebt(id: string, profileId: string): CreditCardDebt {
  const stmt = makeStmt();
  return {
    id,
    userId: "u1",
    profileId,
    label: "Cartao",
    status: "active",
    originalPrincipal: stmt,
    currentBalance: stmt,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    kind: "credit_card",
    creditLimit: null,
    statementDay: 5,
    dueDay: 15,
    currentStatement: stmt,
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeDebtRepo(debt: CreditCardDebt | null): DebtRepositoryPort {
  return {
    findById: vi.fn(async () => debt),
    listForProfile: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makeAckRepo(onUpsert?: (e: DebtDueAcknowledgementEntity) => void): DebtDueAcknowledgementRepositoryPort {
  return {
    upsert: vi.fn(async (e: DebtDueAcknowledgementEntity) => { onUpsert?.(e); }),
    findForDebtCycle: vi.fn(async () => null),
    listPaidCyclesForUser: vi.fn(async () => []),
  };
}

describe("acknowledgeDebtDue", () => {
  it("grava ack paid do ciclo", async () => {
    const saved: DebtDueAcknowledgementEntity[] = [];
    const deps = {
      debts: makeDebtRepo(makeDebt("c1", "p1")),
      acknowledgements: makeAckRepo((e) => { saved.push(e); }),
      clock,
    };
    const r = await acknowledgeDebtDue(deps, { profileId: "p1", userId: "u1", debtId: "c1", cycleIso: "2026-06", response: "paid" });
    expect(isOk(r)).toBe(true);
    expect(saved[0]!.response).toBe("paid");
    expect(saved[0]!.cycleIso).toBe("2026-06");
  });

  it("nega acesso de outro profile", async () => {
    const deps = {
      debts: makeDebtRepo(makeDebt("c1", "outro")),
      acknowledgements: makeAckRepo(),
      clock,
    };
    const r = await acknowledgeDebtDue(deps, { profileId: "p1", userId: "u1", debtId: "c1", cycleIso: "2026-06", response: "paid" });
    expect(isErr(r)).toBe(true);
  });
});

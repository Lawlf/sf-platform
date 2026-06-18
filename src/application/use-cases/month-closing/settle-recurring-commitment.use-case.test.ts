import { describe, expect, it, vi } from "vitest";

import type { DebtEntity, RecurringDebt } from "@/domain/entities/debt.entity";
import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { RecurringSettlementRepositoryPort } from "@/domain/ports/repositories/recurring-settlement.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { settleRecurringCommitment } from "./settle-recurring-commitment.use-case";

const OWNER = "user-1";
const DEBT_ID = "rec-1";

function makeRecurring(overrides: Partial<RecurringDebt> = {}): RecurringDebt {
  return {
    id: DEBT_ID,
    userId: OWNER,
    profileId: "profile-1",
    kind: "recurring",
    label: "Aluguel",
    status: "active",
    originalPrincipal: Money.fromCents(150_000n),
    currentBalance: Money.zero(),
    startDate: new Date(Date.UTC(2026, 0, 1)),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date(Date.UTC(2026, 0, 1)),
    updatedAt: new Date(Date.UTC(2026, 0, 1)),
    deletedAt: null,
    recurringFrequency: "monthly",
    recurringAmountCents: 150_000n,
    expenseCategory: "housing",
    dueDay: null,
    ...overrides,
  };
}

function makeDebtRepo(debt: DebtEntity | null): DebtRepositoryPort {
  return {
    findById: vi.fn(async () => debt),
    listForProfile: vi.fn(),
    create: vi.fn(async (e: DebtEntity) => e),
    update: vi.fn(async (e: DebtEntity) => e),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makeSettlementsRepo(): RecurringSettlementRepositoryPort {
  return {
    upsert: vi.fn(),
    listForUserMonth: vi.fn(),
    listForUser: vi.fn(),
  };
}

function makeClock(now = new Date("2026-04-02T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function firstArg<T>(fn: unknown): T {
  const mock = fn as ReturnType<typeof vi.fn>;
  const call = mock.mock.calls[0];
  if (!call) throw new Error("expected the mock to have been called");
  return call[0] as T;
}

describe("settleRecurringCommitment", () => {
  it("retorna DebtNotFound quando o compromisso não existe", async () => {
    const res = await settleRecurringCommitment(
      { debts: makeDebtRepo(null), settlements: makeSettlementsRepo(), clock: makeClock() },
      { userId: OWNER, debtId: DEBT_ID, monthIso: "2026-03", action: "paid" },
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) expect(res.error).toBeInstanceOf(DebtNotFound);
  });

  it("retorna Forbidden quando o compromisso é de outro usuário", async () => {
    const debt = makeRecurring({ userId: "someone-else" });
    const res = await settleRecurringCommitment(
      { debts: makeDebtRepo(debt), settlements: makeSettlementsRepo(), clock: makeClock() },
      { userId: OWNER, debtId: DEBT_ID, monthIso: "2026-03", action: "convert_to_debt" },
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) expect(res.error).toBeInstanceOf(Forbidden);
  });

  it("paid: no-op, não grava settlement nem cria dívida", async () => {
    const debts = makeDebtRepo(makeRecurring());
    const settlements = makeSettlementsRepo();
    const res = await settleRecurringCommitment(
      { debts, settlements, clock: makeClock() },
      { userId: OWNER, debtId: DEBT_ID, monthIso: "2026-03", action: "paid" },
    );
    expect(isOk(res)).toBe(true);
    expect(settlements.upsert).not.toHaveBeenCalled();
    expect(debts.create).not.toHaveBeenCalled();
    expect(debts.update).not.toHaveBeenCalled();
  });

  it("convert_to_debt: cria dívida com valor do mês e grava settlement converted_to_debt com createdDebtId", async () => {
    const debts = makeDebtRepo(makeRecurring({ recurringAmountCents: 150_000n }));
    const settlements = makeSettlementsRepo();
    const res = await settleRecurringCommitment(
      { debts, settlements, clock: makeClock(new Date("2026-04-02T10:00:00Z")) },
      { userId: OWNER, debtId: DEBT_ID, monthIso: "2026-03", action: "convert_to_debt" },
    );
    expect(isOk(res)).toBe(true);

    expect(debts.create).toHaveBeenCalledTimes(1);
    const createdDebt = firstArg<DebtEntity>(debts.create);
    expect(createdDebt.kind).toBe("personal_loan");
    expect(createdDebt.userId).toBe(OWNER);
    expect(createdDebt.originalPrincipal.toCents()).toBe(150_000n);
    expect(createdDebt.label).toContain("Aluguel");

    expect(settlements.upsert).toHaveBeenCalledTimes(1);
    const settlement = firstArg<RecurringSettlementEntity>(settlements.upsert);
    expect(settlement.status).toBe("converted_to_debt");
    expect(settlement.debtId).toBe(DEBT_ID);
    expect(settlement.createdDebtId).toBe(createdDebt.id);
    expect(settlement.month.getTime()).toBe(new Date("2026-03-01T00:00:00Z").getTime());
    expect(settlement.createdAt.getTime()).toBe(new Date("2026-04-02T10:00:00Z").getTime());
  });

  it("cancel: seta expectedEndDate pro fim do mês e grava settlement cancelled sem createdDebtId", async () => {
    const debts = makeDebtRepo(makeRecurring());
    const settlements = makeSettlementsRepo();
    const res = await settleRecurringCommitment(
      { debts, settlements, clock: makeClock() },
      { userId: OWNER, debtId: DEBT_ID, monthIso: "2026-03", action: "cancel" },
    );
    expect(isOk(res)).toBe(true);

    expect(debts.create).not.toHaveBeenCalled();
    expect(debts.update).toHaveBeenCalledTimes(1);
    const updated = firstArg<DebtEntity>(debts.update);
    // Fim de mar/2026 (último instante do mês).
    expect(updated.expectedEndDate?.getUTCMonth()).toBe(2);
    expect(updated.expectedEndDate?.getUTCFullYear()).toBe(2026);
    expect(updated.expectedEndDate?.getUTCDate()).toBe(31);

    expect(settlements.upsert).toHaveBeenCalledTimes(1);
    const settlement = firstArg<RecurringSettlementEntity>(settlements.upsert);
    expect(settlement.status).toBe("cancelled");
    expect(settlement.createdDebtId).toBeNull();
  });
});

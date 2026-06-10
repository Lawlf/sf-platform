import { describe, expect, it, vi } from "vitest";

import type { DebtEntity, PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { updateDebt } from "./update-debt.use-case";

function makeDebtRepo(): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makeClock(now = new Date("2026-02-01T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeMoney(v: number): Money {
  const r = Money.from(v);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeRate(v: number): InterestRate {
  const r = InterestRate.fromAnnual(v);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeDebt(userId = "user-1"): PersonalLoanDebt {
  const principal = makeMoney(5000);
  return {
    id: "debt-1",
    userId,
    label: "Emprestimo original",
    status: "active",
    originalPrincipal: principal,
    currentBalance: principal,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    annualInterestRate: makeRate(0.24),
    termMonths: 12,
    monthlyInstallment: makeMoney(450),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("updateDebt", () => {
  it("applies partial updates and persists with updated updatedAt", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock(new Date("2026-03-15T10:00:00Z"));
    const existing = makeDebt();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (debts.update as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const newEnd = new Date("2027-01-01");
    const result = await updateDebt(
      { debts, clock },
      {
        userId: "user-1",
        debtId: "debt-1",
        label: "Novo label",
        notes: "Anotacao",
        expectedEndDate: newEnd,
      },
    );

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value.label).toBe("Novo label");
      expect(result.value.notes).toBe("Anotacao");
      expect(result.value.expectedEndDate).toBe(newEnd);
      expect(result.value.updatedAt).toEqual(new Date("2026-03-15T10:00:00Z"));
    }
  });

  it("preserves the stored currency of a USD debt when updating its balance in USD", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    const existing: PersonalLoanDebt = {
      ...makeDebt(),
      originalPrincipal: Money.fromCents(500000n, "USD"),
      currentBalance: Money.fromCents(500000n, "USD"),
      monthlyInstallment: Money.fromCents(45000n, "USD"),
    };
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (debts.update as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const result = await updateDebt(
      { debts, clock },
      {
        userId: "user-1",
        debtId: "debt-1",
        currentBalance: Money.fromCents(400000n, "USD"),
      },
    );

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value.currentBalance.currency).toBe("USD");
      expect(result.value.currentBalance.toCents()).toBe(400000n);
      expect(result.value.originalPrincipal.currency).toBe("USD");
    }
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await updateDebt({ debts, clock }, { userId: "user-1", debtId: "missing" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
    expect(debts.update).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt("owner"));

    const result = await updateDebt(
      { debts, clock },
      { userId: "intruder", debtId: "debt-1", label: "hack" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(debts.update).not.toHaveBeenCalled();
  });
});

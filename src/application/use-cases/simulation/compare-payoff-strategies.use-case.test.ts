import { describe, expect, it, vi } from "vitest";

import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { comparePayoffStrategies } from "./compare-payoff-strategies.use-case";

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

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeMoney(value: number): Money {
  const r = Money.from(value);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeRate(annual: number): InterestRate {
  const r = InterestRate.fromAnnual(annual);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makePersonalLoan(
  id: string,
  principal: number,
  installment: number,
  userId = "user-1",
): PersonalLoanDebt {
  const p = makeMoney(principal);
  return {
    id,
    userId,
    label: `Loan ${id}`,
    status: "active",
    originalPrincipal: p,
    currentBalance: p,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    dueDay: null,
    annualInterestRate: makeRate(0.24),
    termMonths: 24,
    monthlyInstallment: makeMoney(installment),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("comparePayoffStrategies", () => {
  it("uses all active debts when debtIds is empty", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    const d1 = makePersonalLoan("d1", 5000, 300);
    const d2 = makePersonalLoan("d2", 8000, 450);
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([d1, d2]);

    const result = await comparePayoffStrategies(
      { debts, clock },
      {
        userId: "user-1",
        debtIds: [],
        monthlyBudget: makeMoney(1500),
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.snowball.order).toHaveLength(2);
      expect(result.value.avalanche.order).toHaveLength(2);
    }
    expect(debts.listForUser).toHaveBeenCalledWith("user-1", { status: "active" });
  });

  it("filters by explicit debtIds when provided", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    const d1 = makePersonalLoan("d1", 5000, 300);
    const d2 = makePersonalLoan("d2", 8000, 450);
    const d3 = makePersonalLoan("d3", 3000, 200);
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([d1, d2, d3]);

    const result = await comparePayoffStrategies(
      { debts, clock },
      {
        userId: "user-1",
        debtIds: ["d1", "d3"],
        monthlyBudget: makeMoney(1500),
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.snowball.order).toHaveLength(2);
      expect(result.value.snowball.order).toEqual(expect.arrayContaining(["d1", "d3"]));
    }
  });

  it("returns Forbidden when any requested debtId is not in user's active debts", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    const d1 = makePersonalLoan("d1", 5000, 300);
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([d1]);

    const result = await comparePayoffStrategies(
      { debts, clock },
      {
        userId: "user-1",
        debtIds: ["d1", "missing"],
        monthlyBudget: makeMoney(1500),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
  });

  it("returns InvalidAmortizationParamsError when user has no active debts", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await comparePayoffStrategies(
      { debts, clock },
      {
        userId: "user-1",
        debtIds: [],
        monthlyBudget: makeMoney(1500),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAmortizationParamsError);
    }
  });
});

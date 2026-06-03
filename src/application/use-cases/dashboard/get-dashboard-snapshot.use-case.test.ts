import { describe, expect, it, vi } from "vitest";

import type { FinancingDebt, RecurringDebt } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { FinancialHealthService } from "@/domain/services/financial-health.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isErr, isOk } from "@/shared/errors/result";

import { getDashboardSnapshot } from "./get-dashboard-snapshot.use-case";

function makeDebtRepo(): DebtRepository {
  return {
    findById: vi.fn(),
    listForUser: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };
}

function makeIncomeRepo(): IncomeRepository {
  return {
    findById: vi.fn(),
    listForUser: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeMoney(value: number): Money {
  const r = Money.from(value);
  if (!isOk(r)) throw new Error("test setup: invalid money");
  return r.value;
}

function makeRate(annualDecimal: number): InterestRate {
  const r = InterestRate.fromAnnual(annualDecimal);
  if (!isOk(r)) throw new Error("test setup: invalid rate");
  return r.value;
}

function makeFinancing(userId = "user-1"): FinancingDebt {
  const principal = makeMoney(50000);
  return {
    id: "debt-1",
    userId,
    label: "Casa propria",
    status: "active",
    originalPrincipal: principal,
    currentBalance: principal,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "financing",
    amortizationMethod: "PRICE",
    annualInterestRate: makeRate(0.12),
    termMonths: 60,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeRecurring(overrides: Partial<RecurringDebt> = {}): RecurringDebt {
  return {
    id: "rec-1",
    userId: "user-1",
    label: "Aluguel",
    status: "active",
    originalPrincipal: Money.fromCents(0n),
    currentBalance: Money.fromCents(0n),
    startDate: new Date("2026-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    kind: "recurring",
    deletedAt: null,
    recurringFrequency: "monthly",
    recurringAmountCents: 150_000n,
    expenseCategory: "housing",
    dueDay: null,
    ...overrides,
  };
}

function makeIncome(userId = "user-1"): IncomeEntity {
  return {
    id: "income-1",
    userId,
    label: "Salario",
    amount: makeMoney(8000),
    frequency: "monthly",
    startDate: new Date("2026-01-01"),
    endDate: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
  };
}

describe("getDashboardSnapshot", () => {
  it("returns snapshot for user with debts and incomes", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const debt = makeFinancing();
    const income = makeIncome();
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([debt]);
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([income]);

    const result = await getDashboardSnapshot({ debts, incomes, clock }, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.userId).toBe("user-1");
      expect(result.value.totalIncome.toCents()).toBe(income.amount.toCents());
      expect(result.value.totalDebtBalance.toCents()).toBe(debt.currentBalance.toCents());
      expect(result.value.incomeCommittedPct).toBeGreaterThan(0);
    }
    expect(debts.listForUser).toHaveBeenCalledWith("user-1", { status: "active" });
    expect(incomes.listForUser).toHaveBeenCalledWith("user-1", { onlyActive: true });
  });

  it("returns snapshot with zeros when user has no debts or incomes", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const result = await getDashboardSnapshot({ debts, incomes, clock }, { userId: "user-empty" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalIncome.isZero()).toBe(true);
      expect(result.value.totalDebtBalance.isZero()).toBe(true);
      expect(result.value.netWorth.isZero()).toBe(true);
    }
  });

  it("recurring debt enters totalMonthlyService and impacts saldo livre via netWorth", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const income = makeIncome();
    const housing = makeRecurring({ id: "rec-1", recurringAmountCents: 150_000n });
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([housing]);
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([income]);

    const result = await getDashboardSnapshot({ debts, incomes, clock }, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // totalMonthlyService = R$ 1.500,00 (150_000 cents) puramente do recurring.
      expect(result.value.totalMonthlyService.toCents()).toBe(150_000n);
      // netWorth = renda - serviço = 800_000 - 150_000 = 650_000.
      expect(result.value.netWorth.toCents()).toBe(650_000n);
    }
  });

  it("propagates error from FinancialHealthService", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const stub = vi
      .spyOn(FinancialHealthService, "snapshot")
      .mockReturnValue(err(new InvalidAmortizationParamsError("forcado em teste")));

    try {
      const result = await getDashboardSnapshot({ debts, incomes, clock }, { userId: "user-1" });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(InvalidAmortizationParamsError);
      }
    } finally {
      stub.mockRestore();
    }
  });
});

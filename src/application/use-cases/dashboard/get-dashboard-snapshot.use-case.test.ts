import { describe, expect, it, vi } from "vitest";

import type { FinancingDebt, RecurringDebt } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import { FinancialHealthService } from "@/domain/services/financial-health.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isErr, isOk } from "@/shared/errors/result";

import { getDashboardSnapshot } from "./get-dashboard-snapshot.use-case";

const NOW = new Date("2026-05-19T10:00:00Z");

function makeRates(rate: string | null = null): ExchangeRateRepositoryPort {
  return {
    upsertDaily: vi.fn(),
    findLatest: vi.fn(async () =>
      rate ? ({ rateDecimal: rate, asOf: NOW } as never) : null,
    ),
  };
}

function makeOverrides(): UserFxOverrideRepositoryPort {
  return {
    find: vi.fn(async () => null),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(async () => []),
  };
}

function makeDebtRepo(): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForUser: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makeIncomeRepo(): IncomeRepositoryPort {
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
    paymentDay: null,
    endDate: null,
    isEstimated: false,
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

    const result = await getDashboardSnapshot(
      { debts, incomes, clock, rates: makeRates(), overrides: makeOverrides() },
      { userId: "user-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.userId).toBe("user-1");
      expect(result.value.totalIncome.toCents()).toBe(income.amount.toCents());
      expect(result.value.totalDebtBalance.toCents()).toBe(debt.currentBalance.toCents());
      expect(result.value.incomeCommittedPct).toBeGreaterThan(0);
    }
    expect(debts.listForUser).toHaveBeenCalledWith("user-1", { status: "all" });
    expect(incomes.listForUser).toHaveBeenCalledWith("user-1", { onlyActive: true });
  });

  it("written_off debt entra no totalDebtBalance mas nao no serviço mensal; paid_off fica fora", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const active = { ...makeFinancing(), id: "d-active", currentBalance: makeMoney(50_000) };
    const outOfMonth = {
      ...makeFinancing(),
      id: "d-wo",
      status: "written_off" as const,
      currentBalance: makeMoney(20_000),
    };
    const paid = {
      ...makeFinancing(),
      id: "d-paid",
      status: "paid_off" as const,
      currentBalance: makeMoney(0),
    };
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([active, outOfMonth, paid]);
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([makeIncome()]);

    const result = await getDashboardSnapshot(
      { debts, incomes, clock, rates: makeRates(), overrides: makeOverrides() },
      { userId: "user-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // total que se deve: ativa (50k) + fora do mês (20k) = 70k; paid_off não conta
      expect(result.value.totalDebtBalance.toCents()).toBe(7_000_000n);
      // serviço mensal só da ativa (a written_off não pesa no mês)
      const activeOnly = await getDashboardSnapshot(
        {
          debts: (() => {
            const r = makeDebtRepo();
            (r.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([active]);
            return r;
          })(),
          incomes: (() => {
            const r = makeIncomeRepo();
            (r.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([makeIncome()]);
            return r;
          })(),
          clock,
          rates: makeRates(),
          overrides: makeOverrides(),
        },
        { userId: "user-1" },
      );
      if (isOk(activeOnly)) {
        expect(result.value.totalMonthlyService.toCents()).toBe(
          activeOnly.value.totalMonthlyService.toCents(),
        );
      }
    }
  });

  it("returns snapshot with zeros when user has no debts or incomes", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const result = await getDashboardSnapshot(
      { debts, incomes, clock, rates: makeRates(), overrides: makeOverrides() },
      { userId: "user-empty" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalIncome.isZero()).toBe(true);
      expect(result.value.totalDebtBalance.isZero()).toBe(true);
      expect(result.value.monthlyFreeCashFlow.isZero()).toBe(true);
    }
  });

  it("recurring debt enters totalMonthlyService and impacts saldo livre via monthlyFreeCashFlow", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const income = makeIncome();
    const housing = makeRecurring({ id: "rec-1", recurringAmountCents: 150_000n });
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([housing]);
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([income]);

    const result = await getDashboardSnapshot(
      { debts, incomes, clock, rates: makeRates(), overrides: makeOverrides() },
      { userId: "user-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // totalMonthlyService = R$ 1.500,00 (150_000 cents) puramente do recurring.
      expect(result.value.totalMonthlyService.toCents()).toBe(150_000n);
      // monthlyFreeCashFlow = renda - serviço = 800_000 - 150_000 = 650_000.
      expect(result.value.monthlyFreeCashFlow.toCents()).toBe(650_000n);
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
      const result = await getDashboardSnapshot(
        { debts, incomes, clock, rates: makeRates(), overrides: makeOverrides() },
        { userId: "user-1" },
      );
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(InvalidAmortizationParamsError);
      }
    } finally {
      stub.mockRestore();
    }
  });

  it("renda em USD entra convertida no totalIncome (taxa 5.00)", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const usdIncome: IncomeEntity = { ...makeIncome(), amount: Money.fromCents(20_000n, "USD") };
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([usdIncome]);

    const result = await getDashboardSnapshot(
      { debts, incomes, clock, rates: makeRates("5.00"), overrides: makeOverrides() },
      { userId: "user-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalIncome.toCents()).toBe(100_000n);
      expect(result.value.monthlyFreeCashFlow.toCents()).toBe(100_000n);
    }
  });

  it("renda em USD sem taxa disponivel retorna isErr", async () => {
    const debts = makeDebtRepo();
    const incomes = makeIncomeRepo();
    const clock = makeClock();

    const usdIncome: IncomeEntity = { ...makeIncome(), amount: Money.fromCents(20_000n, "USD") };
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([usdIncome]);

    const result = await getDashboardSnapshot(
      { debts, incomes, clock, rates: makeRates(null), overrides: makeOverrides() },
      { userId: "user-1" },
    );

    expect(isErr(result)).toBe(true);
  });
});

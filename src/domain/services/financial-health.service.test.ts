import { describe, expect, it } from "vitest";

import type { FinancingDebt, OverdraftDebt } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors";

import { FinancialHealthService } from "./financial-health.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fx");
  return r.value;
}
function rateAnnual(n: number): InterestRate {
  const r = InterestRate.fromAnnual(n);
  if (!isOk(r)) throw new Error("rate");
  return r.value;
}
function rateMonthly(n: number): InterestRate {
  const r = InterestRate.fromMonthly(n);
  if (!isOk(r)) throw new Error("rate m");
  return r.value;
}

const ASOF = new Date("2024-06-15T00:00:00Z");

function income(over: Partial<IncomeEntity> = {}): IncomeEntity {
  return {
    id: "inc-1",
    userId: "u1",
    label: "Salario",
    amount: moneyOf(5000),
    frequency: "monthly",
    startDate: new Date("2024-01-01"),
    endDate: null,
    isActive: true,
    ...over,
  };
}

function financingDebt(over: Partial<FinancingDebt> = {}): FinancingDebt {
  return {
    id: "fin-1",
    userId: "u1",
    label: "Imovel",
    kind: "financing",
    status: "active",
    originalPrincipal: moneyOf(200_000),
    currentBalance: moneyOf(180_000),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    amortizationMethod: "PRICE",
    annualInterestRate: rateAnnual(0.1),
    termMonths: 360,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    ...over,
  } as FinancingDebt;
}

function overdraftDebt(over: Partial<OverdraftDebt> = {}): OverdraftDebt {
  return {
    id: "od-1",
    userId: "u1",
    label: "Cheque especial",
    kind: "overdraft",
    status: "active",
    originalPrincipal: moneyOf(2000),
    currentBalance: moneyOf(2000),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bankName: "Banco",
    monthlyRate: rateMonthly(0.08),
    lastChargeDate: null,
    ...over,
  } as OverdraftDebt;
}

describe("FinancialHealthService", () => {
  it("snapshot with one income + one financing", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [financingDebt()],
      asOfDate: ASOF,
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.totalIncome.toCents()).toBe(500000n);
      expect(r.value.totalDebtBalance.toCents()).toBe(18000000n);
      expect(r.value.incomeCommittedPct).toBeGreaterThan(0);
    }
  });

  it("no debts -> committed pct 0, netWorth = totalIncome", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [],
      asOfDate: ASOF,
    });
    if (isOk(r)) {
      expect(r.value.incomeCommittedPct).toBe(0);
      expect(r.value.netWorth.toCents()).toBe(r.value.totalIncome.toCents());
    }
  });

  it("weekly income converts to monthly via 52/12", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income({ id: "w", amount: moneyOf(1000), frequency: "weekly" })],
      debts: [],
      asOfDate: ASOF,
    });
    if (isOk(r)) {
      // 1000 * 52/12 = 4333.33
      expect(Math.abs(r.value.totalIncome.toNumber() - 4333.33)).toBeLessThanOrEqual(0.01);
    }
  });

  it("one_off income only counts in its own month", () => {
    const inSame = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [
        income({
          id: "o",
          frequency: "one_off",
          amount: moneyOf(2000),
          startDate: new Date("2024-06-10"),
        }),
      ],
      debts: [],
      asOfDate: ASOF,
    });
    const inOther = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [
        income({
          id: "o",
          frequency: "one_off",
          amount: moneyOf(2000),
          startDate: new Date("2024-05-10"),
        }),
      ],
      debts: [],
      asOfDate: ASOF,
    });
    if (isOk(inSame) && isOk(inOther)) {
      expect(inSame.value.totalIncome.toCents()).toBe(200000n);
      expect(inOther.value.totalIncome.toCents()).toBe(0n);
    }
  });

  it("inactive or out-of-range incomes are ignored", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [
        income({ id: "off", isActive: false }),
        income({ id: "future", startDate: new Date("2025-01-01") }),
        income({ id: "past", endDate: new Date("2023-12-31") }),
      ],
      debts: [],
      asOfDate: ASOF,
    });
    if (isOk(r)) expect(r.value.totalIncome.toCents()).toBe(0n);
  });

  it("written_off debts excluded; only active debts count", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [
        financingDebt(),
        financingDebt({ id: "off", status: "paid_off", currentBalance: moneyOf(50_000) }),
      ],
      asOfDate: ASOF,
    });
    if (isOk(r)) {
      // only active debt counts (180k)
      expect(r.value.totalDebtBalance.toCents()).toBe(18000000n);
    }
  });

  it("cetWeightedAverage is the balance-weighted rate", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [
        financingDebt({
          id: "a",
          currentBalance: moneyOf(10_000),
          annualInterestRate: rateAnnual(0.05),
        }),
        overdraftDebt({
          id: "b",
          currentBalance: moneyOf(10_000),
          monthlyRate: rateMonthly(0.1),
        }),
      ],
      asOfDate: ASOF,
    });
    if (isOk(r)) {
      // weighted monthly rate = (0.05_m * 10k + 0.1 * 10k) / 20k
      // where 0.05_m = (1.05)^(1/12)-1 ~ 0.004074
      const expectedMonthly = (0.004074 * 10_000 + 0.1 * 10_000) / 20_000;
      expect(r.value.cetWeightedAverage.toMonthly().toDecimal()).toBeCloseTo(expectedMonthly, 4);
    }
  });
});

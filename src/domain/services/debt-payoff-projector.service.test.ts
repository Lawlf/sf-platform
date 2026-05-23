import { describe, expect, it } from "vitest";

import type { FinancingDebt, OverdraftDebt } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { PriceAmortizationService } from "./amortization/price-amortization.service";
import { DebtPayoffProjectorService } from "./debt-payoff-projector.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture money");
  return r.value;
}

function rateAnnual(n: number): InterestRate {
  const r = InterestRate.fromAnnual(n);
  if (!isOk(r)) throw new Error("fixture rate annual");
  return r.value;
}

function rateMonthly(n: number): InterestRate {
  const r = InterestRate.fromMonthly(n);
  if (!isOk(r)) throw new Error("fixture rate monthly");
  return r.value;
}

function makeFinancingDebt(overrides: Partial<FinancingDebt> = {}): FinancingDebt {
  return {
    id: "debt-1",
    userId: "user-1",
    label: "Financiamento imovel",
    kind: "financing",
    status: "active",
    originalPrincipal: moneyOf(200_000),
    currentBalance: moneyOf(200_000),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    amortizationMethod: "PRICE",
    annualInterestRate: rateAnnual(0.1),
    termMonths: 360,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  } as FinancingDebt;
}

function makeOverdraftDebt(overrides: Partial<OverdraftDebt> = {}): OverdraftDebt {
  return {
    id: "debt-2",
    userId: "user-1",
    label: "Cheque especial",
    kind: "overdraft",
    status: "active",
    originalPrincipal: moneyOf(10_000),
    currentBalance: moneyOf(10_000),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    bankName: "Banco X",
    monthlyRate: rateMonthly(0.08),
    lastChargeDate: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  } as OverdraftDebt;
}

describe("DebtPayoffProjectorService", () => {
  it("financing at Price parcela pays off in termMonths months", () => {
    const debt = makeFinancingDebt();
    const schedule = PriceAmortizationService.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (!isOk(schedule)) throw new Error("schedule build failed");
    const parcela = schedule.value.installmentAt(1)!.installment;

    const projection = DebtPayoffProjectorService.project({
      debt,
      monthlyPayment: parcela,
      startingFrom: new Date("2024-01-01"),
      maxMonths: 600,
    });
    expect(isOk(projection)).toBe(true);
    if (isOk(projection)) {
      // Allow +/- 1 month of cent-level drift across long horizons.
      expect(projection.value.payoffMonth).toBeGreaterThanOrEqual(debt.termMonths - 1);
      expect(projection.value.payoffMonth).toBeLessThanOrEqual(debt.termMonths + 1);
      expect(projection.value.negativeAmortization).toBe(false);
    }
  });

  it("extra payment shortens payoff horizon", () => {
    const debt = makeFinancingDebt();
    const schedule = PriceAmortizationService.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (!isOk(schedule)) throw new Error("schedule");
    const parcela = schedule.value.installmentAt(1)!.installment;

    const projection = DebtPayoffProjectorService.project({
      debt,
      monthlyPayment: parcela,
      extraPayment: moneyOf(500),
      startingFrom: new Date("2024-01-01"),
      maxMonths: 600,
    });
    if (isOk(projection)) {
      expect(projection.value.payoffMonth).not.toBeNull();
      expect(projection.value.payoffMonth!).toBeLessThan(debt.termMonths);
    }
  });

  it("overdraft with payment less than interest flags negative amortization", () => {
    const debt = makeOverdraftDebt(); // 10k @ 8% a.m.
    const projection = DebtPayoffProjectorService.project({
      debt,
      monthlyPayment: moneyOf(100), // way less than 8% of 10k = 800/m
      startingFrom: new Date("2024-01-01"),
      maxMonths: 12,
    });
    if (isOk(projection)) {
      expect(projection.value.negativeAmortization).toBe(true);
      // payoff not achieved
      expect(projection.value.payoffMonth).toBeNull();
    }
  });

  it("pay exactly the interest -> balance never decreases -> not paid off within cap", () => {
    const debt = makeOverdraftDebt({
      monthlyRate: rateMonthly(0.05),
      currentBalance: moneyOf(1000),
    });
    const projection = DebtPayoffProjectorService.project({
      debt,
      monthlyPayment: moneyOf(50), // 5% of 1000 = exact interest
      startingFrom: new Date("2024-01-01"),
      maxMonths: 24,
    });
    if (isOk(projection)) {
      expect(projection.value.payoffMonth).toBeNull();
    }
  });

  it("invalid inputs return Err", () => {
    const debt = makeFinancingDebt();
    expect(
      isErr(
        DebtPayoffProjectorService.project({
          debt,
          monthlyPayment: moneyOf(1000),
          startingFrom: new Date(),
          maxMonths: 0,
        }),
      ),
    ).toBe(true);
    expect(
      isErr(
        DebtPayoffProjectorService.project({
          debt: { ...debt, currentBalance: moneyOf(0) } as FinancingDebt,
          monthlyPayment: moneyOf(1000),
          startingFrom: new Date(),
          maxMonths: 100,
        }),
      ),
    ).toBe(true);
  });

  it("payoffDate is starting + payoffMonth months", () => {
    const debt = makeFinancingDebt({ currentBalance: moneyOf(1000) });
    const projection = DebtPayoffProjectorService.project({
      debt,
      monthlyPayment: moneyOf(500),
      startingFrom: new Date("2024-01-15T00:00:00Z"),
      maxMonths: 12,
    });
    if (isOk(projection) && projection.value.payoffDate) {
      const expected = new Date("2024-01-15T00:00:00Z");
      expected.setUTCMonth(expected.getUTCMonth() + projection.value.payoffMonth!);
      expect(projection.value.payoffDate.getTime()).toBe(expected.getTime());
    }
  });
});

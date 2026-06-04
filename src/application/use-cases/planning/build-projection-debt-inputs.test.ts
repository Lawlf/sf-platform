import { describe, expect, it } from "vitest";

import type { FinancingDebt, PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { buildProjectionDebtInputs } from "./build-projection-debt-inputs";

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

function personalLoanDebt(over: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  return {
    id: "pl-1",
    userId: "u1",
    label: "Emprestimo pessoal",
    kind: "personal_loan",
    status: "active",
    originalPrincipal: moneyOf(10_000),
    currentBalance: moneyOf(8_000),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    annualInterestRate: rateAnnual(0.12),
    termMonths: 24,
    monthlyInstallment: moneyOf(500),
    ...over,
  } as PersonalLoanDebt;
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
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...over,
  } as FinancingDebt;
}

describe("buildProjectionDebtInputs", () => {
  it("maps an active debt to a projection debt input with balance, monthly rate, and payment", () => {
    const debt = personalLoanDebt();
    const result = buildProjectionDebtInputs([debt]);
    expect(result).toHaveLength(1);
    expect(result[0]!.debtId).toBe(debt.id);
    expect(result[0]!.balanceCents).toBe(debt.currentBalance.toCents());
    expect(result[0]!.monthlyRate).toBeGreaterThanOrEqual(0);
    expect(result[0]!.monthlyPaymentCents).toBeGreaterThan(0n);
  });

  it("skips debts whose monthly service cannot be computed", () => {
    const broken = financingDebt({ termMonths: 0 });
    expect(buildProjectionDebtInputs([broken])).toHaveLength(0);
  });

  it("returns an empty array for no debts", () => {
    expect(buildProjectionDebtInputs([])).toEqual([]);
  });
});

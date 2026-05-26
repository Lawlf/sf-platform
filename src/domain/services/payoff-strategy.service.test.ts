import { describe, expect, it } from "vitest";

import type {
  CreditCardDebt,
  OverdraftDebt,
  PersonalLoanDebt,
} from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { PayoffStrategyService } from "./payoff-strategy.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
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

function makePersonalLoan(over: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  return {
    id: "pl-1",
    userId: "u1",
    label: "Personal",
    kind: "personal_loan",
    status: "active",
    originalPrincipal: moneyOf(2000),
    currentBalance: moneyOf(2000),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    annualInterestRate: rateAnnual(0.05),
    termMonths: 24,
    monthlyInstallment: moneyOf(90),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...over,
  } as PersonalLoanDebt;
}

function makeOverdraft(over: Partial<OverdraftDebt> = {}): OverdraftDebt {
  return {
    id: "od-1",
    userId: "u1",
    label: "Cheque especial",
    kind: "overdraft",
    status: "active",
    originalPrincipal: moneyOf(1000),
    currentBalance: moneyOf(1000),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bankName: "Banco",
    monthlyRate: rateMonthly(0.08),
    lastChargeDate: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...over,
  } as OverdraftDebt;
}

describe("PayoffStrategyService", () => {
  it("snowball clears smallest first; avalanche clears highest rate first", () => {
    const small = makePersonalLoan({
      id: "small",
      currentBalance: moneyOf(500),
      originalPrincipal: moneyOf(500),
      monthlyInstallment: moneyOf(60),
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
      annualInterestRate: rateAnnual(0.05),
    });
    const expensive = makeOverdraft({
      id: "expensive",
      currentBalance: moneyOf(2000),
      monthlyRate: rateMonthly(0.06),
    });
    const r = PayoffStrategyService.compare({
      debts: [small, expensive],
      monthlyBudget: moneyOf(400),
      startingFrom: new Date("2024-01-01"),
      maxMonths: 120,
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.snowball.order[0]).toBe("small");
      expect(r.value.avalanche.order[0]).toBe("expensive");
    }
  });

  it("single debt -> snowball == avalanche", () => {
    const debt = makePersonalLoan();
    const r = PayoffStrategyService.compare({
      debts: [debt],
      monthlyBudget: moneyOf(200),
      startingFrom: new Date("2024-01-01"),
      maxMonths: 60,
    });
    if (isOk(r)) {
      expect(r.value.snowball.monthsToFreedom).toBe(r.value.avalanche.monthsToFreedom);
      expect(r.value.snowball.totalPaid.toCents()).toBe(r.value.avalanche.totalPaid.toCents());
    }
  });

  it("budget below sum minimums returns Err", () => {
    const debt = makePersonalLoan({ monthlyInstallment: moneyOf(1500) });
    expect(
      isErr(
        PayoffStrategyService.compare({
          debts: [debt],
          monthlyBudget: moneyOf(100),
          startingFrom: new Date("2024-01-01"),
        }),
      ),
    ).toBe(true);
  });

  it("snowball total paid >= avalanche total paid (math guarantee)", () => {
    const a = makePersonalLoan({
      id: "a",
      currentBalance: moneyOf(500),
      monthlyInstallment: moneyOf(40),
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
      annualInterestRate: rateAnnual(0.02),
    });
    const b = makeOverdraft({
      id: "b",
      currentBalance: moneyOf(3000),
      monthlyRate: rateMonthly(0.05),
    });
    const r = PayoffStrategyService.compare({
      debts: [a, b],
      monthlyBudget: moneyOf(400),
      startingFrom: new Date("2024-01-01"),
    });
    if (
      isOk(r) &&
      r.value.snowball.monthsToFreedom !== null &&
      r.value.avalanche.monthsToFreedom !== null
    ) {
      expect(r.value.snowball.totalPaid.compare(r.value.avalanche.totalPaid)).not.toBe(-1);
    }
  });

  it("monthsToFreedom is null when budget cannot escape interest accrual", () => {
    const debt = makeOverdraft({
      currentBalance: moneyOf(10_000),
      monthlyRate: rateMonthly(0.1),
    });
    const r = PayoffStrategyService.compare({
      debts: [debt],
      monthlyBudget: moneyOf(1000),
      startingFrom: new Date("2024-01-01"),
      maxMonths: 24,
    });
    if (isOk(r)) {
      expect(r.value.snowball.monthsToFreedom).toBeNull();
    }
  });

  it("credit card minimum = 15% of statement (or interest if zero)", () => {
    const card: CreditCardDebt = {
      id: "cc-1",
      userId: "u1",
      label: "Cartao",
      kind: "credit_card",
      status: "active",
      originalPrincipal: moneyOf(0),
      currentBalance: moneyOf(2000),
      startDate: new Date("2024-01-01"),
      expectedEndDate: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creditLimit: moneyOf(5000),
      statementDay: 10,
      dueDay: 17,
      currentStatement: moneyOf(2000),
      revolvingBalance: null,
      revolvingMonthlyRate: rateMonthly(0.15),
      installmentPurchases: [],
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
    } as CreditCardDebt;
    expect(
      isErr(
        PayoffStrategyService.compare({
          debts: [card],
          monthlyBudget: moneyOf(200),
          startingFrom: new Date("2024-01-01"),
        }),
      ),
    ).toBe(true);
    const r = PayoffStrategyService.compare({
      debts: [card],
      monthlyBudget: moneyOf(600),
      startingFrom: new Date("2024-01-01"),
      maxMonths: 36,
    });
    expect(isOk(r)).toBe(true);
  });
});

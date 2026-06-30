import { describe, expect, it } from "vitest";

import type {
  CreditCardDebt,
  FinancingDebt,
  OverdraftDebt,
  PersonalLoanDebt,
} from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { PriceAmortizationService } from "./amortization/price-amortization.service";
import { addMonthsClamped, computeInstallmentDueDates } from "./debt-calendar.service";

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

function makeFinancing(overrides: Partial<FinancingDebt> = {}): FinancingDebt {
  return {
    id: "d1",
    userId: "u1",
    profileId: "profile-1",
    label: "Apto",
    kind: "financing",
    status: "active",
    originalPrincipal: moneyOf(100_000),
    currentBalance: moneyOf(100_000),
    startDate: new Date(Date.UTC(2026, 0, 15)),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    amortizationMethod: "PRICE",
    annualInterestRate: rateAnnual(0.1),
    termMonths: 60,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    monthlyInstallment: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

function makePersonalLoan(overrides: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  return {
    id: "d2",
    userId: "u1",
    profileId: "profile-1",
    label: "Emprestimo",
    kind: "personal_loan",
    dueDay: null,
    payrollDeducted: false,
    linkedIncomeId: null,
    status: "active",
    originalPrincipal: moneyOf(10_000),
    currentBalance: moneyOf(10_000),
    startDate: new Date(Date.UTC(2026, 0, 31)),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    annualInterestRate: rateAnnual(0.2),
    termMonths: 12,
    monthlyInstallment: moneyOf(1000),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

function makeCreditCard(overrides: Partial<CreditCardDebt> = {}): CreditCardDebt {
  return {
    id: "d3",
    userId: "u1",
    profileId: "profile-1",
    label: "Cartao",
    kind: "credit_card",
    status: "active",
    originalPrincipal: moneyOf(0),
    currentBalance: moneyOf(0),
    startDate: new Date(Date.UTC(2026, 0, 5)),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    creditLimit: moneyOf(10_000),
    statementDay: 10,
    dueDay: 20,
    currentStatement: moneyOf(0),
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

function makeOverdraft(): OverdraftDebt {
  return {
    id: "d4",
    userId: "u1",
    profileId: "profile-1",
    label: "Cheque",
    kind: "overdraft",
    status: "active",
    originalPrincipal: moneyOf(0),
    currentBalance: moneyOf(0),
    startDate: new Date(Date.UTC(2026, 0, 1)),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    bankName: "Banco",
    monthlyRate: rateAnnual(0.5),
    lastChargeDate: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("addMonthsClamped", () => {
  it("adds months simply", () => {
    const start = new Date(Date.UTC(2026, 0, 15));
    expect(addMonthsClamped(start, 1)).toEqual(new Date(Date.UTC(2026, 1, 15)));
    expect(addMonthsClamped(start, 12)).toEqual(new Date(Date.UTC(2027, 0, 15)));
  });

  it("clamps Jan 31 to Feb 28 in non-leap year", () => {
    const start = new Date(Date.UTC(2026, 0, 31));
    expect(addMonthsClamped(start, 1)).toEqual(new Date(Date.UTC(2026, 1, 28)));
  });

  it("clamps Jan 31 to Feb 29 in leap year", () => {
    const start = new Date(Date.UTC(2024, 0, 31));
    expect(addMonthsClamped(start, 1)).toEqual(new Date(Date.UTC(2024, 1, 29)));
  });

  it("clamps Mar 31 to Apr 30", () => {
    const start = new Date(Date.UTC(2026, 2, 31));
    expect(addMonthsClamped(start, 1)).toEqual(new Date(Date.UTC(2026, 3, 30)));
  });
});

describe("computeInstallmentDueDates - financing", () => {
  it("returns one entry per installment with correct dates", () => {
    const debt = makeFinancing();
    const schedule = PriceAmortizationService.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (!isOk(schedule)) throw new Error("schedule");

    const dueDates = computeInstallmentDueDates(debt, schedule.value);

    expect(dueDates).toHaveLength(60);
    expect(dueDates[0]!.dueDate).toEqual(new Date(Date.UTC(2026, 0, 15)));
    expect(dueDates[1]!.dueDate).toEqual(new Date(Date.UTC(2026, 1, 15)));
    expect(dueDates[59]!.dueDate).toEqual(new Date(Date.UTC(2030, 11, 15)));
    expect(dueDates[0]!.description).toBe("Parcela 1/60");
    expect(dueDates[59]!.description).toBe("Parcela 60/60");
  });

  it("returns empty when schedule is null", () => {
    expect(computeInstallmentDueDates(makeFinancing(), null)).toEqual([]);
  });
});

describe("computeInstallmentDueDates - personal_loan with Jan 31 startDate", () => {
  it("clamps February to 28", () => {
    const debt = makePersonalLoan();
    const schedule = PriceAmortizationService.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (!isOk(schedule)) throw new Error("schedule");

    const dueDates = computeInstallmentDueDates(debt, schedule.value);
    expect(dueDates[0]!.dueDate).toEqual(new Date(Date.UTC(2026, 0, 31)));
    expect(dueDates[1]!.dueDate).toEqual(new Date(Date.UTC(2026, 1, 28)));
    expect(dueDates[2]!.dueDate).toEqual(new Date(Date.UTC(2026, 2, 31)));
    expect(dueDates[3]!.dueDate).toEqual(new Date(Date.UTC(2026, 3, 30)));
  });
});

describe("computeInstallmentDueDates - credit_card", () => {
  it("aggregates multi-purchase month by month", () => {
    const debt = makeCreditCard({
      installmentPurchases: [
        {
          description: "TV",
          total: moneyOf(900),
          installmentsTotal: 3,
          installmentsRemaining: 3,
          monthlyValue: moneyOf(300),
        },
        {
          description: "Geladeira",
          total: moneyOf(1200),
          installmentsTotal: 6,
          installmentsRemaining: 6,
          monthlyValue: moneyOf(200),
        },
      ],
    });

    const dueDates = computeInstallmentDueDates(debt, null);
    expect(dueDates).toHaveLength(6);
    expect(dueDates[0]!.dueDate).toEqual(new Date(Date.UTC(2026, 0, 20)));
    expect(dueDates[0]!.amount.toCents()).toBe(50000n);
    expect(dueDates[2]!.amount.toCents()).toBe(50000n);
    expect(dueDates[3]!.amount.toCents()).toBe(20000n);
    expect(dueDates[5]!.amount.toCents()).toBe(20000n);
    expect(dueDates[0]!.description).toBe("2 compras parceladas");
    expect(dueDates[3]!.description).toBe("Parcela 4/6");
  });

  it("skips dueDay this month when startDate is past it", () => {
    const debt = makeCreditCard({
      startDate: new Date(Date.UTC(2026, 0, 25)),
      dueDay: 20,
      installmentPurchases: [
        {
          description: "Phone",
          total: moneyOf(600),
          installmentsTotal: 3,
          installmentsRemaining: 3,
          monthlyValue: moneyOf(200),
        },
      ],
    });

    const dueDates = computeInstallmentDueDates(debt, null);
    expect(dueDates[0]!.dueDate).toEqual(new Date(Date.UTC(2026, 1, 20)));
  });

  it("returns empty when no active installment purchases", () => {
    const debt = makeCreditCard({ installmentPurchases: [] });
    expect(computeInstallmentDueDates(debt, null)).toEqual([]);
  });
});

describe("computeInstallmentDueDates - overdraft", () => {
  it("returns empty", () => {
    expect(computeInstallmentDueDates(makeOverdraft(), null)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import type {
  CreditCardDebt,
  PersonalLoanDebt,
  RecurringDebt,
} from "@/domain/entities/debt.entity";
import { PriceAmortizationService } from "@/domain/services/amortization/price-amortization.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { computeOverdueSettlement } from "./debt-settlement.service";

function money(cents: bigint): Money {
  return Money.fromCents(cents);
}

function rate(annual: number): InterestRate {
  const r = InterestRate.fromAnnual(annual);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

const baseDebt = {
  userId: "u1",
  profileId: "p1",
  status: "active" as const,
  startDate: new Date("2026-01-01"),
  expectedEndDate: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
  recurringFrequency: null,
  recurringAmountCents: null,
  expenseCategory: null,
};

function creditCard(overrides: { balance: bigint; statement: bigint }): CreditCardDebt {
  return {
    ...baseDebt,
    id: "cc1",
    label: "Cartão",
    kind: "credit_card",
    originalPrincipal: money(overrides.balance),
    currentBalance: money(overrides.balance),
    creditLimit: null,
    statementDay: 5,
    dueDay: 15,
    currentStatement: money(overrides.statement),
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
  };
}

function personalLoan(overrides: {
  balance: bigint;
  installment: bigint;
}): PersonalLoanDebt {
  return {
    ...baseDebt,
    id: "pl1",
    label: "Empréstimo",
    kind: "personal_loan",
    originalPrincipal: money(overrides.balance),
    currentBalance: money(overrides.balance),
    annualInterestRate: rate(24),
    termMonths: 12,
    monthlyInstallment: money(overrides.installment),
    dueDay: 10,
  };
}

function recurring(): RecurringDebt {
  return {
    ...baseDebt,
    id: "r1",
    label: "Assinatura",
    kind: "recurring",
    originalPrincipal: money(0n),
    currentBalance: money(0n),
    recurringFrequency: "monthly",
    recurringAmountCents: 9900n,
    expenseCategory: "subscriptions",
    dueDay: 8,
  };
}

describe("computeOverdueSettlement", () => {
  it("retorna null para recorrente (sem saldo a abater)", () => {
    expect(computeOverdueSettlement({ debt: recurring(), amortization: null, paymentsCount: 0 })).toBeNull();
  });

  it("retorna null para recorrente mesmo com saldo informativo positivo", () => {
    const debt = { ...recurring(), currentBalance: money(5000n) };
    expect(computeOverdueSettlement({ debt, amortization: null, paymentsCount: 0 })).toBeNull();
  });

  it("retorna null quando saldo é zero", () => {
    const debt = creditCard({ balance: 0n, statement: 10000n });
    expect(computeOverdueSettlement({ debt, amortization: null, paymentsCount: 0 })).toBeNull();
  });

  it("cartão abate a fatura como principal, juros zero", () => {
    const debt = creditCard({ balance: 120000n, statement: 30000n });
    const s = computeOverdueSettlement({ debt, amortization: null, paymentsCount: 0 });
    expect(s?.principal.toCents()).toBe(30000n);
    expect(s?.interest.toCents()).toBe(0n);
  });

  it("cartão limita o principal ao saldo quando fatura excede saldo", () => {
    const debt = creditCard({ balance: 20000n, statement: 30000n });
    const s = computeOverdueSettlement({ debt, amortization: null, paymentsCount: 0 });
    expect(s?.principal.toCents()).toBe(20000n);
  });

  it("empréstimo usa o split da parcela PRICE corrente", () => {
    const principal = Money.fromCents(1000000n);
    const schedule = PriceAmortizationService.generate({
      principal,
      annualRate: rate(24),
      termMonths: 12,
    });
    if (!isOk(schedule)) throw new Error("schedule setup");
    const first = schedule.value.installmentAt(1)!;
    const debt = personalLoan({ balance: 1000000n, installment: first.installment.toCents() });
    const s = computeOverdueSettlement({
      debt,
      amortization: schedule.value,
      paymentsCount: 0,
    });
    expect(s?.principal.toCents()).toBe(first.principal.toCents());
    expect(s?.interest.toCents()).toBe(first.interest.toCents());
    expect(s!.interest.toCents()).toBeGreaterThan(0n);
  });

  it("empréstimo avança a parcela conforme pagamentos já feitos", () => {
    const principal = Money.fromCents(1000000n);
    const schedule = PriceAmortizationService.generate({
      principal,
      annualRate: rate(24),
      termMonths: 12,
    });
    if (!isOk(schedule)) throw new Error("schedule setup");
    const third = schedule.value.installmentAt(3)!;
    const debt = personalLoan({ balance: 800000n, installment: third.installment.toCents() });
    const s = computeOverdueSettlement({
      debt,
      amortization: schedule.value,
      paymentsCount: 2,
    });
    expect(s?.principal.toCents()).toBe(third.principal.toCents());
    expect(s?.interest.toCents()).toBe(third.interest.toCents());
  });

  it("empréstimo sem amortização cai pra parcela como principal", () => {
    const debt = personalLoan({ balance: 500000n, installment: 50000n });
    const s = computeOverdueSettlement({ debt, amortization: null, paymentsCount: 0 });
    expect(s?.principal.toCents()).toBe(50000n);
    expect(s?.interest.toCents()).toBe(0n);
  });
});

import { describe, expect, it } from "vitest";

import type { DebtEntity, FinancingDebt, OverdraftDebt, PersonalLoanDebt } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import {
  FinancialHealthService,
  monthlyDebtService,
  monthlyRateFor,
} from "./financial-health.service";

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
const NOW = new Date("2026-06-18T10:00:00Z");

function income(over: Partial<IncomeEntity> = {}): IncomeEntity {
  return {
    id: "inc-1",
    userId: "u1",
    profileId: "profile-1",
    label: "Salario",
    amount: moneyOf(5000),
    frequency: "monthly",
    startDate: new Date("2024-01-01"),
    paymentDay: null,
    endDate: null,
    isEstimated: false,
    sourceBreakdown: null,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    deletedAt: null,
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
    monthlyInstallment: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
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
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
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

  it("no debts -> committed pct 0, monthlyFreeCashFlow = totalIncome", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [],
      asOfDate: ASOF,
    });
    if (isOk(r)) {
      expect(r.value.incomeCommittedPct).toBe(0);
      expect(r.value.monthlyFreeCashFlow.toCents()).toBe(r.value.totalIncome.toCents());
    }
  });

  it("weekly income converts to monthly via WEEKS_PER_MONTH (4.33)", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income({ id: "w", amount: moneyOf(1000), frequency: "weekly" })],
      debts: [],
      asOfDate: ASOF,
    });
    if (isOk(r)) {
      // 1000 * 4.33 = 4330; coeficiente único do produto (ver monthly-frequency).
      expect(Math.abs(r.value.totalIncome.toNumber() - 4330)).toBeLessThanOrEqual(0.01);
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

  it("written_off debt counts in totalDebtBalance but NOT in monthly service/commitment", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [
        personalLoanDebt({
          id: "active",
          currentBalance: moneyOf(8_000),
          monthlyInstallment: moneyOf(500),
        }),
        overdraftDebt({
          id: "wo",
          status: "written_off",
          currentBalance: moneyOf(2_000),
          monthlyRate: rateMonthly(0.08),
        }),
      ],
      asOfDate: ASOF,
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      // total que se deve inclui a dívida fora do mês: 8000 + 2000 = 10000
      expect(r.value.totalDebtBalance.toCents()).toBe(1_000_000n);
      // serviço mensal só da ativa (500); o cheque especial written_off (160) fica de fora
      expect(r.value.totalMonthlyService.toCents()).toBe(50_000n);
      // saldo livre = renda (5000) - serviço ativo (500) = 4500
      expect(r.value.monthlyFreeCashFlow.toCents()).toBe(450_000n);
    }
  });

  it("paid_off debt counts in NEITHER total nor monthly", () => {
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [
        personalLoanDebt({
          id: "active",
          currentBalance: moneyOf(8_000),
          monthlyInstallment: moneyOf(500),
        }),
        overdraftDebt({ id: "po", status: "paid_off", currentBalance: moneyOf(2_000) }),
      ],
      asOfDate: ASOF,
    });
    if (isOk(r)) {
      expect(r.value.totalDebtBalance.toCents()).toBe(800_000n);
      expect(r.value.totalMonthlyService.toCents()).toBe(50_000n);
    }
  });

  it("payroll-deducted personal loan uses derived balance, not stale currentBalance", () => {
    const asOf = new Date("2024-07-15");
    const r = FinancialHealthService.snapshot({
      userId: "u1",
      incomes: [income()],
      debts: [
        personalLoanDebt({
          id: "consignado",
          payrollDeducted: true,
          startDate: new Date("2024-01-15"),
          termMonths: 24,
          monthlyInstallment: moneyOf(2_430),
          currentBalance: moneyOf(58_320), // stale: nunca foi atualizado manualmente
        }),
        personalLoanDebt({
          id: "manual",
          payrollDeducted: false,
          currentBalance: moneyOf(8_000),
        }),
      ],
      asOfDate: asOf,
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      // consignado: 6 meses decorridos -> 18 parcelas restantes * 2430 = 43740 (não 58320)
      // manual: usa currentBalance armazenado, sem alteração (8000)
      expect(r.value.totalDebtBalance.toCents()).toBe(5_174_000n);
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
    dueDay: null,
    payrollDeducted: false,
    linkedIncomeId: null,
    ...over,
  } as PersonalLoanDebt;
}

describe("debt mappers (exported for prescription engine)", () => {
  it("monthlyRateFor returns the monthly decimal rate for a personal loan", () => {
    // toMonthly() uses compound conversion: (1 + annual)^(1/12) - 1
    // (1.12)^(1/12) - 1 ~ 0.009489
    expect(monthlyRateFor(personalLoanDebt())).toBeCloseTo(0.009489, 5);
  });

  it("monthlyDebtService returns the monthly installment in reais for a personal loan", () => {
    const r = monthlyDebtService(personalLoanDebt());
    expect(isOk(r) && r.value).toBe(500);
  });

  it("financing with stored monthlyInstallment returns it directly (flat stream)", () => {
    // Parcela armazenada (3000) difere de propósito do valor amortizado
    // (principal/termo = 58320/24 = 2430): se a branch flat sumir, o serviço
    // volta a amortizar e retorna 2430, falhando este teste.
    const debt = financingDebt({
      monthlyInstallment: moneyOf(3000),
      annualInterestRate: rateAnnual(0),
      originalPrincipal: moneyOf(58_320),
      currentBalance: moneyOf(46_170),
      termMonths: 24,
      status: "active",
    });
    const svc = monthlyDebtService(debt);
    expect(isOk(svc) && svc.value).toBe(3000);
  });

  it("credit card with no statement counts open installments", () => {
    const card = {
      id: "c1",
      userId: "u1",
      kind: "credit_card",
      status: "active",
      label: "Cartao",
      currentBalance: moneyOf(0),
      originalPrincipal: moneyOf(0),
      creditLimit: moneyOf(6000),
      statementDay: 1,
      dueDay: 10,
      currentStatement: moneyOf(0),
      revolvingBalance: moneyOf(0),
      revolvingMonthlyRate: null,
      installmentPurchases: [
        {
          description: "Geladeira",
          total: moneyOf(2400),
          installmentsTotal: 12,
          installmentsRemaining: 8,
          monthlyValue: moneyOf(200),
        },
      ],
      createdAt: NOW,
      deletedAt: null,
    } as unknown as DebtEntity;

    const svc = monthlyDebtService(card);
    expect(isOk(svc) && svc.value).toBe(200);
  });

  it("credit card with a statement ignores installments (no double count)", () => {
    const card = {
      id: "c2",
      userId: "u1",
      kind: "credit_card",
      status: "active",
      label: "Cartao",
      currentBalance: moneyOf(0),
      originalPrincipal: moneyOf(0),
      creditLimit: moneyOf(6000),
      statementDay: 1,
      dueDay: 10,
      currentStatement: moneyOf(1000),
      revolvingBalance: moneyOf(0),
      revolvingMonthlyRate: null,
      installmentPurchases: [
        {
          description: "Geladeira",
          total: moneyOf(2400),
          installmentsTotal: 12,
          installmentsRemaining: 8,
          monthlyValue: moneyOf(200),
        },
      ],
      createdAt: NOW,
      deletedAt: null,
    } as unknown as DebtEntity;

    const svc = monthlyDebtService(card);
    expect(isOk(svc) && svc.value).toBe(1000);
  });
});

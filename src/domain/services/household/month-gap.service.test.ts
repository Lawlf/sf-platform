import { describe, expect, it } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { monthGapPieces } from "./month-gap.service";

const NOW = new Date("2026-06-01T00:00:00Z");

function m(reais: number): Money {
  const r = Money.from(reais);
  if (!isOk(r)) throw new Error("invalid money");
  return r.value;
}

function rate(monthly: number): InterestRate {
  const r = InterestRate.fromMonthly(monthly);
  if (!isOk(r)) throw new Error("invalid rate");
  return r.value;
}

function makeIncome(id: string, opts: Partial<IncomeEntity> = {}): IncomeEntity {
  return {
    id,
    userId: "u1",
    profileId: "p1",
    label: "Renda",
    amount: m(3000),
    frequency: "monthly",
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: null,
    isActive: true,
    isEstimated: false,
    sourceBreakdown: null,
    paymentDay: null,
    createdAt: NOW,
    deletedAt: null,
    ...opts,
  };
}

function makeSettlement(
  incomeId: string,
  status: IncomeSettlementEntity["status"],
  adjustedAmountCents?: bigint,
): IncomeSettlementEntity {
  return {
    userId: "u1",
    profileId: "p1",
    incomeId,
    month: new Date("2026-06-01T00:00:00Z"),
    status,
    adjustedAmountCents: adjustedAmountCents ?? null,
    createdAt: NOW,
  };
}

function makeRecurringDebt(id: string, amountReais: number): DebtEntity {
  return {
    id,
    userId: "u1",
    profileId: "p1",
    kind: "recurring",
    label: "Assinatura",
    status: "active",
    originalPrincipal: m(0),
    currentBalance: m(0),
    startDate: NOW,
    expectedEndDate: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    recurringFrequency: "monthly",
    recurringAmountCents: BigInt(amountReais * 100),
    expenseCategory: "subscriptions",
    dueDay: null,
  } as DebtEntity;
}

function makePersonalLoan(id: string, installmentReais: number): DebtEntity {
  return {
    id,
    userId: "u1",
    profileId: "p1",
    kind: "personal_loan",
    label: "Empréstimo",
    status: "active",
    originalPrincipal: m(10000),
    currentBalance: m(8000),
    startDate: NOW,
    expectedEndDate: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    annualInterestRate: rate(0.02),
    termMonths: 24,
    monthlyInstallment: m(installmentReais),
    dueDay: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  } as DebtEntity;
}

describe("monthGapPieces", () => {
  it("no incomes no debts returns zeros", () => {
    const result = monthGapPieces({ debts: [], incomes: [], settlements: [], now: NOW });
    expect(result.custosGarantidosCents).toBe(0n);
    expect(result.jaRecebidoCents).toBe(0n);
    expect(result.aReceberConfirmadoCents).toBe(0n);
    expect(result.aReceberEstimadoCents).toBe(0n);
  });

  it("custos = sum of active debt monthly service", () => {
    const debts = [makeRecurringDebt("d1", 200), makePersonalLoan("d2", 500)];
    const result = monthGapPieces({ debts, incomes: [], settlements: [], now: NOW });
    expect(result.custosGarantidosCents).toBe(70000n);
  });

  it("paid_off debt excluded from custos", () => {
    const debt = { ...makeRecurringDebt("d1", 300), status: "paid_off" } as DebtEntity;
    const result = monthGapPieces({ debts: [debt], incomes: [], settlements: [], now: NOW });
    expect(result.custosGarantidosCents).toBe(0n);
  });

  it("income with received settlement goes to jaRecebido", () => {
    const income = makeIncome("i1", { amount: m(5000) });
    const settlement = makeSettlement("i1", "received");
    const result = monthGapPieces({
      debts: [],
      incomes: [income],
      settlements: [settlement],
      now: NOW,
    });
    expect(result.jaRecebidoCents).toBe(500000n);
    expect(result.aReceberConfirmadoCents).toBe(0n);
    expect(result.aReceberEstimadoCents).toBe(0n);
  });

  it("income with adjusted settlement uses adjustedAmountCents", () => {
    const income = makeIncome("i1", { amount: m(5000) });
    const settlement = makeSettlement("i1", "adjusted", 420000n);
    const result = monthGapPieces({
      debts: [],
      incomes: [income],
      settlements: [settlement],
      now: NOW,
    });
    expect(result.jaRecebidoCents).toBe(420000n);
  });

  it("income with not_received settlement contributes nothing", () => {
    const income = makeIncome("i1", { amount: m(4000) });
    const settlement = makeSettlement("i1", "not_received");
    const result = monthGapPieces({
      debts: [],
      incomes: [income],
      settlements: [settlement],
      now: NOW,
    });
    expect(result.jaRecebidoCents).toBe(0n);
    expect(result.aReceberConfirmadoCents).toBe(0n);
    expect(result.aReceberEstimadoCents).toBe(0n);
  });

  it("income without settlement and isEstimated=false goes to aReceberConfirmado", () => {
    const income = makeIncome("i1", { amount: m(6000), isEstimated: false });
    const result = monthGapPieces({ debts: [], incomes: [income], settlements: [], now: NOW });
    expect(result.aReceberConfirmadoCents).toBe(600000n);
    expect(result.aReceberEstimadoCents).toBe(0n);
  });

  it("income without settlement and isEstimated=true goes to aReceberEstimado", () => {
    const income = makeIncome("i1", { amount: m(2000), isEstimated: true });
    const result = monthGapPieces({ debts: [], incomes: [income], settlements: [], now: NOW });
    expect(result.aReceberEstimadoCents).toBe(200000n);
    expect(result.aReceberConfirmadoCents).toBe(0n);
  });

  it("weekly income is normalized by WEEKS_PER_MONTH", () => {
    const income = makeIncome("i1", { amount: m(1000), frequency: "weekly" });
    const result = monthGapPieces({ debts: [], incomes: [income], settlements: [], now: NOW });
    const expected = BigInt(Math.round(100000 * 4.33));
    expect(result.aReceberConfirmadoCents).toBe(expected);
  });

  it("one_off income outside current month is excluded", () => {
    const income = makeIncome("i1", {
      amount: m(10000),
      frequency: "one_off",
      startDate: new Date("2026-05-15T00:00:00Z"),
    });
    const result = monthGapPieces({ debts: [], incomes: [income], settlements: [], now: NOW });
    expect(result.aReceberConfirmadoCents).toBe(0n);
  });

  it("one_off income in current month is included", () => {
    const income = makeIncome("i1", {
      amount: m(3000),
      frequency: "one_off",
      startDate: new Date("2026-06-01T00:00:00Z"),
    });
    const result = monthGapPieces({ debts: [], incomes: [income], settlements: [], now: NOW });
    expect(result.aReceberConfirmadoCents).toBe(300000n);
  });

  it("inactive income is excluded", () => {
    const income = makeIncome("i1", { amount: m(5000), isActive: false });
    const result = monthGapPieces({ debts: [], incomes: [income], settlements: [], now: NOW });
    expect(result.aReceberConfirmadoCents).toBe(0n);
  });

  it("deleted income is excluded", () => {
    const income = makeIncome("i1", {
      amount: m(5000),
      deletedAt: new Date("2026-05-01T00:00:00Z"),
    });
    const result = monthGapPieces({ debts: [], incomes: [income], settlements: [], now: NOW });
    expect(result.aReceberConfirmadoCents).toBe(0n);
  });

  it("settlement from different month does not match", () => {
    const income = makeIncome("i1", { amount: m(4000) });
    const wrongMonthSettlement: IncomeSettlementEntity = {
      userId: "u1",
      profileId: "p1",
      incomeId: "i1",
      month: new Date("2026-05-01T00:00:00Z"),
      status: "received",
      adjustedAmountCents: null,
      createdAt: NOW,
    };
    const result = monthGapPieces({
      debts: [],
      incomes: [income],
      settlements: [wrongMonthSettlement],
      now: NOW,
    });
    expect(result.jaRecebidoCents).toBe(0n);
    expect(result.aReceberConfirmadoCents).toBe(400000n);
  });

  it("multiple incomes and debts are all summed", () => {
    const debts = [makeRecurringDebt("d1", 150), makePersonalLoan("d2", 800)];
    const incomes = [
      makeIncome("i1", { amount: m(4000), isEstimated: false }),
      makeIncome("i2", { amount: m(2000), isEstimated: true }),
    ];
    const settlements = [makeSettlement("i1", "received")];
    const result = monthGapPieces({ debts, incomes, settlements, now: NOW });
    expect(result.custosGarantidosCents).toBe(95000n);
    expect(result.jaRecebidoCents).toBe(400000n);
    expect(result.aReceberConfirmadoCents).toBe(0n);
    expect(result.aReceberEstimadoCents).toBe(200000n);
  });
});

import { describe, expect, it } from "vitest";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { WalletEventGenerator } from "./wallet-event-generator.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
  return r.value;
}
const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));

function income(over: Partial<IncomeEntity>): IncomeEntity {
  return {
    id: "i1",
    userId: "u1",
    label: "Salário",
    amount: moneyOf(5000),
    frequency: "monthly",
    startDate: utc(2026, 1, 1),
    endDate: null,
    isEstimated: false,
    isActive: true,
    paymentDay: 5,
    createdAt: utc(2026, 1, 1),
    deletedAt: null,
    ...over,
  };
}

describe("WalletEventGenerator.incomeEvents", () => {
  it("one monthly credit per month on paymentDay", () => {
    const events = WalletEventGenerator.incomeEvents([income({})], {
      from: utc(2026, 5, 1),
      to: utc(2026, 6, 30),
    });
    expect(events).toHaveLength(2);
    expect(events[0]!.date).toEqual(utc(2026, 5, 5));
    expect(events[0]!.direction).toBe("in");
    expect(events[0]!.amount.toNumber()).toBe(5000);
    expect(events[1]!.date).toEqual(utc(2026, 6, 5));
  });

  it("falls back to startDate day when paymentDay is null", () => {
    const events = WalletEventGenerator.incomeEvents([income({ paymentDay: null, startDate: utc(2026, 1, 12) })], {
      from: utc(2026, 6, 1),
      to: utc(2026, 6, 30),
    });
    expect(events[0]!.date).toEqual(utc(2026, 6, 12));
  });

  it("clamps paymentDay 31 to the last day of a short month", () => {
    const events = WalletEventGenerator.incomeEvents([income({ paymentDay: 31 })], {
      from: utc(2026, 6, 1),
      to: utc(2026, 6, 30),
    });
    expect(events[0]!.date).toEqual(utc(2026, 6, 30));
  });

  it("weekly income credits its monthly-equivalent (x4.33)", () => {
    const events = WalletEventGenerator.incomeEvents([income({ frequency: "weekly", amount: moneyOf(1000) })], {
      from: utc(2026, 6, 1),
      to: utc(2026, 6, 30),
    });
    expect(events[0]!.amount.toNumber()).toBeCloseTo(4330, 0);
  });

  it("one_off credits only in its start month", () => {
    const events = WalletEventGenerator.incomeEvents(
      [income({ frequency: "one_off", startDate: utc(2026, 6, 10), paymentDay: null })],
      { from: utc(2026, 5, 1), to: utc(2026, 7, 31) },
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 6, 10));
  });

  it("skips months before startDate and after endDate", () => {
    const events = WalletEventGenerator.incomeEvents(
      [income({ startDate: utc(2026, 6, 1), endDate: utc(2026, 6, 30) })],
      { from: utc(2026, 5, 1), to: utc(2026, 7, 31) },
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 6, 5));
  });

  it("skips archived income (isActive false, no endDate)", () => {
    const events = WalletEventGenerator.incomeEvents([income({ isActive: false })], {
      from: utc(2026, 6, 1),
      to: utc(2026, 6, 30),
    });
    expect(events).toHaveLength(0);
  });

  it("income confirmed not_received that month emits no event", () => {
    const settlement: IncomeSettlementEntity = {
      userId: "u1",
      incomeId: "i1",
      month: utc(2026, 6, 1),
      status: "not_received",
      adjustedAmountCents: null,
      createdAt: utc(2026, 6, 30),
    };
    const events = WalletEventGenerator.incomeEvents(
      [income({})],
      { from: utc(2026, 6, 1), to: utc(2026, 6, 30) },
      [settlement],
    );
    expect(events).toHaveLength(0);
  });

  it("income confirmed adjusted uses the adjusted amount", () => {
    const settlement: IncomeSettlementEntity = {
      userId: "u1",
      incomeId: "i1",
      month: utc(2026, 6, 1),
      status: "adjusted",
      adjustedAmountCents: 320000n,
      createdAt: utc(2026, 6, 30),
    };
    const events = WalletEventGenerator.incomeEvents(
      [income({})],
      { from: utc(2026, 6, 1), to: utc(2026, 6, 30) },
      [settlement],
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.amount.toNumber()).toBe(3200);
    expect(events[0]!.date).toEqual(utc(2026, 6, 5));
  });

  it("income confirmed received uses the full amount", () => {
    const settlement: IncomeSettlementEntity = {
      userId: "u1",
      incomeId: "i1",
      month: utc(2026, 6, 1),
      status: "received",
      adjustedAmountCents: null,
      createdAt: utc(2026, 6, 30),
    };
    const events = WalletEventGenerator.incomeEvents(
      [income({})],
      { from: utc(2026, 6, 1), to: utc(2026, 6, 30) },
      [settlement],
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.amount.toNumber()).toBe(5000);
  });

  it("a settlement only affects its own month", () => {
    const settlement: IncomeSettlementEntity = {
      userId: "u1",
      incomeId: "i1",
      month: utc(2026, 5, 1),
      status: "not_received",
      adjustedAmountCents: null,
      createdAt: utc(2026, 5, 31),
    };
    const events = WalletEventGenerator.incomeEvents(
      [income({})],
      { from: utc(2026, 5, 1), to: utc(2026, 6, 30) },
      [settlement],
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 6, 5));
  });
});

function txn(over: Partial<TransactionEntity>): TransactionEntity {
  return {
    id: "t1",
    userId: "u1",
    direction: "out",
    amount: moneyOf(40),
    description: "Café",
    category: null,
    accountId: "wallet-1",
    occurredAt: utc(2026, 6, 7),
    status: "paid",
    source: "manual",
    externalId: null,
    createdAt: utc(2026, 6, 7),
    deletedAt: null,
    ...over,
  };
}

describe("WalletEventGenerator.transactionEvents", () => {
  it("maps a paid wallet transaction to an out event", () => {
    const events = WalletEventGenerator.transactionEvents([txn({})], "wallet-1");
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 6, 7));
    expect(events[0]!.direction).toBe("out");
    expect(events[0]!.amount.toNumber()).toBe(40);
  });

  it("keeps an in transaction as in", () => {
    const events = WalletEventGenerator.transactionEvents([txn({ direction: "in", amount: moneyOf(200) })], "wallet-1");
    expect(events[0]!.direction).toBe("in");
    expect(events[0]!.amount.toNumber()).toBe(200);
  });

  it("ignores transactions on other accounts", () => {
    expect(WalletEventGenerator.transactionEvents([txn({ accountId: "other" })], "wallet-1")).toHaveLength(0);
  });

  it("ignores scheduled (unpaid) transactions", () => {
    expect(WalletEventGenerator.transactionEvents([txn({ status: "scheduled" })], "wallet-1")).toHaveLength(0);
  });

  it("ignores soft-deleted transactions", () => {
    expect(WalletEventGenerator.transactionEvents([txn({ deletedAt: utc(2026, 6, 8) })], "wallet-1")).toHaveLength(0);
  });
});

function recurringDebt(over: Partial<DebtEntity>): DebtEntity {
  return {
    id: "d1",
    userId: "u1",
    kind: "recurring",
    label: "Aluguel",
    status: "active",
    currentBalance: moneyOf(0),
    recurringFrequency: "monthly",
    recurringAmountCents: 120000n,
    expenseCategory: "housing",
    dueDay: 20,
    createdAt: utc(2026, 1, 1),
    deletedAt: null,
    ...over,
  } as unknown as DebtEntity;
}

function debtPayment(over: Partial<DebtPaymentEntity>): DebtPaymentEntity {
  return {
    id: "p1",
    debtId: "d1",
    paidAt: utc(2026, 5, 6),
    amount: moneyOf(1200),
    principalPortion: moneyOf(1200),
    interestPortion: moneyOf(0),
    isExtra: false,
    isClosingPayment: false,
    ...over,
  };
}

describe("WalletEventGenerator.debtEvents", () => {
  it("one out event per month on dueDay for a recurring debt", () => {
    const events = WalletEventGenerator.debtEvents([recurringDebt({})], [], [], {
      from: utc(2026, 5, 1),
      to: utc(2026, 6, 30),
    });
    expect(events).toHaveLength(2);
    expect(events[0]!.date).toEqual(utc(2026, 5, 20));
    expect(events[0]!.direction).toBe("out");
    expect(events[0]!.amount.toNumber()).toBe(1200);
  });

  it("skips a month settled as converted_to_debt", () => {
    const settlement: RecurringSettlementEntity = {
      userId: "u1",
      debtId: "d1",
      month: utc(2026, 5, 1),
      status: "converted_to_debt",
      createdDebtId: "d99",
      createdAt: utc(2026, 5, 31),
    };
    const events = WalletEventGenerator.debtEvents([recurringDebt({})], [settlement], [], {
      from: utc(2026, 5, 1),
      to: utc(2026, 6, 30),
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 6, 20));
  });

  it("skips inactive debts", () => {
    const events = WalletEventGenerator.debtEvents([recurringDebt({ status: "paid_off" })], [], [], {
      from: utc(2026, 5, 1),
      to: utc(2026, 6, 30),
    });
    expect(events).toHaveLength(0);
  });

  it("with no payment, still emits at dueDay (existing behavior preserved)", () => {
    const events = WalletEventGenerator.debtEvents([recurringDebt({ dueDay: 10 })], [], [], {
      from: utc(2026, 5, 1),
      to: utc(2026, 5, 31),
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 5, 10));
    expect(events[0]!.amount.toNumber()).toBe(1200);
  });

  it("debits on the day a payment was actually made, not the due day", () => {
    const events = WalletEventGenerator.debtEvents(
      [recurringDebt({ dueDay: 10 })],
      [],
      [debtPayment({ paidAt: utc(2026, 5, 6), amount: moneyOf(1200) })],
      { from: utc(2026, 5, 1), to: utc(2026, 5, 31) },
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 5, 6));
    expect(events[0]!.direction).toBe("out");
    expect(events[0]!.amount.toNumber()).toBe(1200);
  });

  it("uses the payment amount, not monthlyDebtService, when a payment exists", () => {
    const events = WalletEventGenerator.debtEvents(
      [recurringDebt({ dueDay: 10 })],
      [],
      [debtPayment({ paidAt: utc(2026, 5, 6), amount: moneyOf(900) })],
      { from: utc(2026, 5, 1), to: utc(2026, 5, 31) },
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.date).toEqual(utc(2026, 5, 6));
    expect(events[0]!.amount.toNumber()).toBe(900);
  });
});

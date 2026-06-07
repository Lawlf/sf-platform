import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { monthlyDebtService } from "./financial-health.service";
import type { WalletEvent } from "./wallet-balance.service";

const WEEKS_PER_MONTH = 4.33;

export interface EventWindow {
  from: Date;
  to: Date;
}

function* monthStarts(window: EventWindow): Generator<{ year: number; month: number }> {
  let y = window.from.getUTCFullYear();
  let m = window.from.getUTCMonth();
  const endY = window.to.getUTCFullYear();
  const endM = window.to.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    yield { year: y, month: m };
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
}

function dateInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function sameMonth(a: { year: number; month: number }, d: Date): boolean {
  return a.year === d.getUTCFullYear() && a.month === d.getUTCMonth();
}

function isIncomeActiveInMonth(income: IncomeEntity, m: { year: number; month: number }): boolean {
  const monthStart = new Date(Date.UTC(m.year, m.month, 1));
  const monthEnd = new Date(Date.UTC(m.year, m.month + 1, 0, 23, 59, 59, 999));
  if (income.startDate.getTime() > monthEnd.getTime()) return false;
  if (income.endDate) {
    if (income.endDate.getTime() < monthStart.getTime()) return false;
  } else if (!income.isActive) {
    return false;
  }
  return true;
}

function incomeMonthlyAmount(income: IncomeEntity): Money {
  switch (income.frequency) {
    case "monthly":
      return income.amount;
    case "weekly":
      return income.amount.multiply(WEEKS_PER_MONTH);
    case "one_off":
      return income.amount;
  }
}

function debtDueDay(debt: DebtEntity): number {
  if (debt.kind === "recurring") return debt.dueDay ?? 1;
  if (debt.kind === "credit_card") return debt.dueDay;
  return 1;
}

function isSettledAway(
  settlements: RecurringSettlementEntity[],
  debtId: string,
  m: { year: number; month: number },
): boolean {
  return settlements.some(
    (s) =>
      s.debtId === debtId &&
      s.month.getUTCFullYear() === m.year &&
      s.month.getUTCMonth() === m.month &&
      (s.status === "converted_to_debt" || s.status === "cancelled"),
  );
}

export class WalletEventGenerator {
  static incomeEvents(incomes: IncomeEntity[], window: EventWindow): WalletEvent[] {
    const events: WalletEvent[] = [];
    for (const income of incomes) {
      if (income.deletedAt !== null) continue;
      for (const m of monthStarts(window)) {
        if (income.frequency === "one_off") {
          if (!sameMonth(m, income.startDate)) continue;
        }
        if (!isIncomeActiveInMonth(income, m)) continue;
        const day = income.paymentDay ?? income.startDate.getUTCDate();
        const date =
          income.frequency === "one_off" && income.paymentDay === null
            ? income.startDate
            : dateInMonth(m.year, m.month, day);
        events.push({ date, amount: incomeMonthlyAmount(income), direction: "in" });
      }
    }
    return events;
  }

  static transactionEvents(transactions: TransactionEntity[], walletId: string): WalletEvent[] {
    return transactions
      .filter((t) => t.deletedAt === null && t.status === "paid" && t.accountId === walletId)
      .map((t) => ({ date: t.occurredAt, amount: t.amount, direction: t.direction }));
  }

  static debtEvents(
    debts: DebtEntity[],
    settlements: RecurringSettlementEntity[],
    window: EventWindow,
  ): WalletEvent[] {
    const events: WalletEvent[] = [];
    for (const debt of debts) {
      if (debt.deletedAt !== null || debt.status !== "active") continue;
      const svc = monthlyDebtService(debt);
      if (!isOk(svc)) continue;
      const amountR = Money.from(svc.value);
      if (!isOk(amountR)) continue;
      const amount = amountR.value;
      if (amount.isZero()) continue;
      const day = debtDueDay(debt);
      for (const m of monthStarts(window)) {
        if (isSettledAway(settlements, debt.id, m)) continue;
        events.push({ date: dateInMonth(m.year, m.month, day), amount, direction: "out" });
      }
    }
    return events;
  }

  static generate(input: {
    incomes: IncomeEntity[];
    debts: DebtEntity[];
    settlements: RecurringSettlementEntity[];
    transactions: TransactionEntity[];
    walletId: string;
    window: EventWindow;
  }): WalletEvent[] {
    return [
      ...WalletEventGenerator.incomeEvents(input.incomes, input.window),
      ...WalletEventGenerator.debtEvents(input.debts, input.settlements, input.window),
      ...WalletEventGenerator.transactionEvents(input.transactions, input.walletId),
    ];
  }
}

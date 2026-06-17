import type { DebtAmountAdjustmentEntity } from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { WEEKS_PER_MONTH } from "./monthly-frequency";
import { effectiveIncomeCentsForMonth } from "./income-settlement.service";
import { monthlyDebtOutflow, type TimelineSettlement } from "./timeline.service";
import type { WalletEvent } from "./wallet-balance.service";

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

function toTimelineSettlements(settlements: RecurringSettlementEntity[]): TimelineSettlement[] {
  return settlements.map((s) => ({
    debtId: s.debtId,
    monthIso: MonthYear.fromDate(s.month).toIso(),
    status: s.status,
  }));
}

export class WalletEventGenerator {
  static incomeEvents(
    incomes: IncomeEntity[],
    window: EventWindow,
    incomeSettlements: IncomeSettlementEntity[] = [],
  ): WalletEvent[] {
    const events: WalletEvent[] = [];
    for (const income of incomes) {
      if (income.deletedAt !== null) continue;
      for (const m of monthStarts(window)) {
        if (income.frequency === "one_off") {
          if (!sameMonth(m, income.startDate)) continue;
        }
        if (!isIncomeActiveInMonth(income, m)) continue;
        const baseCents = incomeMonthlyAmount(income).toCents();
        const effectiveCents = effectiveIncomeCentsForMonth(income.id, baseCents, m, incomeSettlements);
        if (effectiveCents <= 0n) continue;
        const day = income.paymentDay ?? income.startDate.getUTCDate();
        const date =
          income.frequency === "one_off" && income.paymentDay === null
            ? income.startDate
            : dateInMonth(m.year, m.month, day);
        events.push({ date, amount: Money.fromCents(effectiveCents), direction: "in" });
      }
    }
    return events;
  }

  static transactionEvents(transactions: TransactionEntity[], walletId: string): WalletEvent[] {
    return transactions
      .filter((t) => t.deletedAt === null && t.status === "paid" && t.accountId === walletId)
      .map((t) => ({ date: t.occurredAt, amount: t.amount, direction: t.direction }));
  }

  /**
   * Saídas de dívida da janela como eventos datados. Delega a regra de "quanto
   * sai por mês" ao ponto de verdade `monthlyDebtOutflow` (mesmo cálculo do
   * detalhe do mês), garantindo que a projeção da carteira e a tela do mês nunca
   * divirjam de sinal. `currentMonth` decide o que é projeção vs realizado para
   * dívidas não-recorrentes; o caller passa o mês de "agora".
   */
  static debtEvents(
    debts: DebtEntity[],
    settlements: RecurringSettlementEntity[],
    payments: DebtPaymentEntity[],
    window: EventWindow,
    adjustments: DebtAmountAdjustmentEntity[] = [],
    currentMonth: MonthYear = MonthYear.fromDate(window.from),
  ): WalletEvent[] {
    const timelineSettlements = toTimelineSettlements(settlements);
    const events: WalletEvent[] = [];
    for (const m of monthStarts(window)) {
      const month = MonthYear.from(m.year, m.month + 1);
      const paymentsThisMonth = payments.filter((p) => sameMonth(m, p.paidAt));
      const items = monthlyDebtOutflow({
        debts,
        paymentsThisMonth,
        month,
        currentMonth,
        adjustments,
        settlements: timelineSettlements,
      });
      for (const item of items) {
        const date = item.paidAt ?? dateInMonth(m.year, m.month, item.day);
        events.push({ date, amount: item.amount, direction: "out" });
      }
    }
    return events;
  }

  static generate(input: {
    incomes: IncomeEntity[];
    debts: DebtEntity[];
    settlements: RecurringSettlementEntity[];
    incomeSettlements?: IncomeSettlementEntity[];
    payments: DebtPaymentEntity[];
    transactions: TransactionEntity[];
    walletId: string;
    window: EventWindow;
    adjustments?: DebtAmountAdjustmentEntity[];
    currentMonth?: MonthYear;
  }): WalletEvent[] {
    return [
      ...WalletEventGenerator.incomeEvents(input.incomes, input.window, input.incomeSettlements ?? []),
      ...WalletEventGenerator.debtEvents(
        input.debts,
        input.settlements,
        input.payments,
        input.window,
        input.adjustments ?? [],
        input.currentMonth ?? MonthYear.fromDate(input.window.from),
      ),
      ...WalletEventGenerator.transactionEvents(input.transactions, input.walletId),
    ];
  }
}

import { MonthYear } from "@/domain/value-objects/month-year.vo";

type SettledStatus = "received" | "not_received" | "adjusted" | null;

interface DatedRow {
  dateIso: string;
}

interface IncomeRow extends DatedRow {
  settledStatus: SettledStatus;
}

export interface MonthCloseInput {
  flat: boolean;
  positive: boolean;
  incomes: ReadonlyArray<IncomeRow>;
  expenses: ReadonlyArray<DatedRow>;
  payments: ReadonlyArray<DatedRow>;
  monthIso: string;
  todayIso: string;
  hasPendingEstimatedIncome: boolean;
}

export interface MonthCloseState {
  showBridge: boolean;
  showCelebration: boolean;
  celebratePositive: boolean;
}

function dayOf(todayIso: string): number {
  return parseInt(todayIso.slice(8, 10), 10);
}

function hasRealizedBase(input: MonthCloseInput): boolean {
  const rows: ReadonlyArray<DatedRow> = [...input.incomes, ...input.expenses, ...input.payments];
  return rows.some((r) => r.dateIso.slice(0, 10) <= input.todayIso);
}

function incomeAllConfirmed(incomes: ReadonlyArray<IncomeRow>): boolean {
  return incomes.length > 0 && incomes.every((i) => i.settledStatus !== null);
}

function inLastDays(monthIso: string, todayIso: string): boolean {
  const days = MonthYear.fromIso(monthIso).daysInMonth();
  return dayOf(todayIso) >= days - 2;
}

export function resolveMonthClose(input: MonthCloseInput): MonthCloseState {
  const base = input.flat && hasRealizedBase(input);
  const celebrate =
    base &&
    (incomeAllConfirmed(input.incomes) ||
      (inLastDays(input.monthIso, input.todayIso) && !input.hasPendingEstimatedIncome));
  return { showBridge: base, showCelebration: celebrate, celebratePositive: input.positive };
}

export function daysUntilNextMonth(monthIso: string, todayIso: string): number {
  const days = MonthYear.fromIso(monthIso).daysInMonth();
  return days - dayOf(todayIso) + 1;
}

export function nextMonthFloorCents(detail: {
  totals: { free: { cents: string }; estimatedIncome: { cents: string } };
}): bigint {
  return BigInt(detail.totals.free.cents) - BigInt(detail.totals.estimatedIncome.cents);
}

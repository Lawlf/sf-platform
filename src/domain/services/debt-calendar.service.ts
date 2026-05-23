import type {
  CreditCardDebt,
  DebtEntity,
  RecurringDebt,
} from "@/domain/entities/debt.entity";
import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { Money } from "@/domain/value-objects/money.vo";

export interface InstallmentDueDate {
  month: number;
  dueDate: Date;
  amount: Money;
  description: string;
  total: number;
}

// Janela default para recorrentes em aberto: gera 12 vencimentos a partir do
// mês corrente. Suficiente para Apple/Google Calendar até o usuário re-baixar
// o ICS no próximo ano.
const RECURRING_DEFAULT_HORIZON_MONTHS = 12;

export function computeInstallmentDueDates(
  debt: DebtEntity,
  schedule: AmortizationSchedule | null,
  now: Date = new Date(),
): InstallmentDueDate[] {
  if (debt.kind === "financing" || debt.kind === "personal_loan") {
    if (!schedule) return [];
    const total = schedule.installments.length;
    return schedule.installments.map((row) => ({
      month: row.month,
      dueDate: addMonthsClamped(debt.startDate, row.month - 1),
      amount: row.installment,
      description: `Parcela ${row.month}/${total}`,
      total,
    }));
  }

  if (debt.kind === "credit_card") {
    return computeCreditCardSchedule(debt);
  }

  if (debt.kind === "recurring") {
    return computeRecurringSchedule(debt, now);
  }

  return [];
}

function computeCreditCardSchedule(debt: CreditCardDebt): InstallmentDueDate[] {
  const purchases = debt.installmentPurchases.filter((p) => p.installmentsRemaining > 0);
  if (purchases.length === 0) return [];

  const maxRemaining = Math.max(...purchases.map((p) => p.installmentsRemaining));
  const firstDue = nextDueDateOnOrAfter(debt.startDate, debt.dueDay);

  const rows: InstallmentDueDate[] = [];
  for (let monthOffset = 0; monthOffset < maxRemaining; monthOffset++) {
    let amountCents = 0n;
    let activePurchases = 0;
    for (const purchase of purchases) {
      if (monthOffset < purchase.installmentsRemaining) {
        amountCents += purchase.monthlyValue.toCents();
        activePurchases++;
      }
    }
    if (amountCents === 0n) continue;
    const dueDate = addMonthsClamped(firstDue, monthOffset);
    const month = monthOffset + 1;
    rows.push({
      month,
      dueDate,
      amount: Money.fromCents(amountCents),
      description:
        activePurchases === 1
          ? `Parcela ${month}/${maxRemaining}`
          : `${activePurchases} compras parceladas`,
      total: maxRemaining,
    });
  }
  return rows;
}

// Dada uma chave de mês `YYYY-MM`, retorna a data esperada de vencimento da
// dívida nesse mês. Usado pelo histórico mensal pra exibir a linha do tempo
// com a data exata em que o pagamento cai.
export function dueDateForMonth(debt: DebtEntity, monthKey: string): Date | null {
  const [yStr, mStr] = monthKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;

  let day: number | null = null;
  switch (debt.kind) {
    case "recurring":
      day = debt.dueDay ?? debt.startDate.getUTCDate();
      break;
    case "credit_card":
      day = debt.dueDay;
      break;
    case "financing":
    case "personal_loan":
    case "overdraft":
      day = debt.startDate.getUTCDate();
      break;
  }
  if (!day) return null;
  const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const clamped = Math.min(day, lastDayOfMonth);
  return new Date(Date.UTC(y, m - 1, clamped));
}

export function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const monthIdx = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const targetYear = year + Math.floor(monthIdx / 12);
  const targetMonth = ((monthIdx % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfMonth);
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

function computeRecurringSchedule(debt: RecurringDebt, now: Date): InstallmentDueDate[] {
  // Pra MVP, só `monthly` gera calendário. `weekly` e `annual` ficam vazios
  // até modelarmos UX específica.
  if (debt.recurringFrequency !== "monthly") return [];

  const amount = Money.fromCents(debt.recurringAmountCents);
  const dueDay = debt.dueDay ?? debt.startDate.getUTCDate();

  // Primeiro vencimento na janela: o mais tardio entre o startDate e o mês
  // corrente. Recurrentes antigos não viram histórico de calendário no ICS.
  const startAnchor = pickStartAnchor(debt.startDate, now);
  const first = nextDueDateOnOrAfter(startAnchor, dueDay);

  // Limite: ou expectedEndDate (clampado pro dia do vencimento) ou janela
  // default de 12 meses.
  const horizonEnd = addMonthsClamped(first, RECURRING_DEFAULT_HORIZON_MONTHS - 1);
  const end = debt.expectedEndDate ?? horizonEnd;
  const effectiveEnd = end.getTime() < horizonEnd.getTime() ? end : horizonEnd;

  const rows: InstallmentDueDate[] = [];
  let monthOffset = 0;
  while (true) {
    const dueDate = addMonthsClamped(first, monthOffset);
    if (dueDate.getTime() > effectiveEnd.getTime()) break;
    rows.push({
      month: monthOffset + 1,
      dueDate,
      amount,
      description: `Vencimento ${formatPtBrMonth(dueDate)}`,
      total: 0,
    });
    monthOffset++;
    if (monthOffset > 600) break; // hard guard contra loop infinito.
  }
  // `total` é desconhecido (recorrência aberta). Mantém 0 ou substitui pelo
  // tamanho final.
  return rows.map((r) => ({ ...r, total: rows.length }));
}

function pickStartAnchor(startDate: Date, now: Date): Date {
  return startDate.getTime() > now.getTime() ? startDate : now;
}

const PT_BR_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatPtBrMonth(date: Date): string {
  const m = PT_BR_MONTHS[date.getUTCMonth()] ?? "";
  return `${m}/${date.getUTCFullYear()}`;
}

function nextDueDateOnOrAfter(startDate: Date, dueDay: number): Date {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const lastDayCurrentMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const clampedDayCurrentMonth = Math.min(dueDay, lastDayCurrentMonth);
  const candidate = new Date(Date.UTC(year, month, clampedDayCurrentMonth));
  if (candidate.getTime() >= startDate.getTime()) return candidate;
  const lastDayNextMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const clampedDayNextMonth = Math.min(dueDay, lastDayNextMonth);
  return new Date(Date.UTC(year, month + 1, clampedDayNextMonth));
}

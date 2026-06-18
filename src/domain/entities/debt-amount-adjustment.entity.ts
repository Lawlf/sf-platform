import type { Money } from "@/domain/value-objects/money.vo";

// Tipo de ajuste no valor mensal de uma dívida.
// - "period": faixa contínua de meses com um valor fixo (ex.: reajuste anual de
//   assinatura). startMonth obrigatório, endMonth null = aberto até hoje.
// - "override": override pontual de um único mês (ex.: pulei pagamento, ou
//   paguei valor diferente naquele mês específico).
//
// Precedência ao resolver o valor efetivo de um mês:
//   override > period > valor base da própria dívida (debt.monthlyAmount, etc).
export type DebtAmountAdjustmentKind = "period" | "override";

interface BaseAdjustment {
  id: string;
  debtId: string;
  userId: string;
  profileId: string;
  amount: Money;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeriodAdjustment extends BaseAdjustment {
  kind: "period";
  startMonth: string; // YYYY-MM, obrigatório
  endMonth: string | null; // YYYY-MM ou null (aberto)
}

export interface OverrideAdjustment extends BaseAdjustment {
  kind: "override";
  month: string; // YYYY-MM, obrigatório
}

export type DebtAmountAdjustmentEntity = PeriodAdjustment | OverrideAdjustment;

// Formato ISO "YYYY-MM". Compara como string já que é zero-padded.
export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthKeyFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Compara YYYY-MM lexicograficamente. Retorna -1, 0 ou 1.
export function compareMonthKey(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// Verifica se um dado mês cai dentro do range [startMonth, endMonth] (ambos
// inclusivos, endMonth=null = aberto pra frente).
export function periodCovers(period: PeriodAdjustment, monthKey: string): boolean {
  if (compareMonthKey(monthKey, period.startMonth) < 0) return false;
  if (period.endMonth === null) return true;
  return compareMonthKey(monthKey, period.endMonth) <= 0;
}

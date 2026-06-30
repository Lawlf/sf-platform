import type { TransactionStatus } from "@/domain/entities/transaction.entity";

export function isFutureDay(date: Date, now: Date): boolean {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return day > today;
}

/**
 * Ninguém paga algo no futuro: um lançamento com data futura é sempre previsto
 * (scheduled), nunca pago, independentemente do que foi marcado na entrada.
 */
export function resolveStatusForDate(
  status: TransactionStatus,
  occurredAt: Date,
  now: Date,
): TransactionStatus {
  return isFutureDay(occurredAt, now) ? "scheduled" : status;
}

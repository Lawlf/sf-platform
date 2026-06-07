import type { ReconciliationStatus } from "@/domain/services/reconciliation.service";

export interface MonthClosingEntity {
  userId: string;
  /** Primeiro dia do mes (UTC). */
  month: Date;
  baselineNetWorthCents: bigint;
  endNetWorthCents: bigint;
  theoreticalFreeCashFlowCents: bigint;
  leakCents: bigint;
  endDebtBalanceCents?: bigint | null;
  endReserveCents?: bigint | null;
  committedPctBps?: number | null;
  closedAt: Date;
}

export function closingStatus(c: {
  theoreticalFreeCashFlowCents: bigint;
  leakCents: bigint;
}): ReconciliationStatus {
  return c.leakCents > 0n ? "leaked" : c.leakCents < 0n ? "ahead" : "on_track";
}

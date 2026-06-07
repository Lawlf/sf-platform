export type IncomeSettlementStatus = "received" | "not_received" | "adjusted";

export interface IncomeSettlementEntity {
  userId: string;
  incomeId: string;
  /** Primeiro dia do mes (UTC). */
  month: Date;
  status: IncomeSettlementStatus;
  /** Valor confirmado quando `status === "adjusted"` (em centavos). */
  adjustedAmountCents: bigint | null;
  createdAt: Date;
}

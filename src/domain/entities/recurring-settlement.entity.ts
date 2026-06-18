export type RecurringSettlementStatus = "converted_to_debt" | "cancelled";

export interface RecurringSettlementEntity {
  userId: string;
  profileId: string;
  debtId: string;
  /** Primeiro dia do mes (UTC). */
  month: Date;
  status: RecurringSettlementStatus;
  /** Dívida criada quando `status === "converted_to_debt"`. */
  createdDebtId: string | null;
  createdAt: Date;
}

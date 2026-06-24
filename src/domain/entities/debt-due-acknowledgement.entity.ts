export type DebtDueAckResponse = "paid" | "deferred" | "written_off";

export interface DebtDueAcknowledgementEntity {
  id: string;
  userId: string;
  debtId: string;
  cycleIso: string;
  response: DebtDueAckResponse;
  respondedAt: Date;
  createdAt: Date;
}

import type { DebtDueAcknowledgementEntity } from "@/domain/entities/debt-due-acknowledgement.entity";

export interface DebtDueAcknowledgementRepositoryPort {
  upsert(entity: DebtDueAcknowledgementEntity): Promise<void>;
  findForDebtCycle(
    debtId: string,
    cycleIso: string,
  ): Promise<DebtDueAcknowledgementEntity | null>;
  listPaidCyclesForUser(userId: string): Promise<{ debtId: string; cycleIso: string }[]>;
}

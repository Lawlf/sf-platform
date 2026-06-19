import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";

export interface RecurringSettlementRepositoryPort {
  upsert(settlement: RecurringSettlementEntity): Promise<void>;
  listForProfileMonth(profileId: string, month: Date): Promise<RecurringSettlementEntity[]>;
  listForProfile(profileId: string): Promise<RecurringSettlementEntity[]>;
}

import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";

export interface RecurringSettlementRepository {
  upsert(settlement: RecurringSettlementEntity): Promise<void>;
  listForUserMonth(userId: string, month: Date): Promise<RecurringSettlementEntity[]>;
  listForUser(userId: string): Promise<RecurringSettlementEntity[]>;
}

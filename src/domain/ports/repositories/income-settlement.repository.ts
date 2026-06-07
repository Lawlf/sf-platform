import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";

export interface IncomeSettlementRepository {
  upsert(settlement: IncomeSettlementEntity): Promise<void>;
  listForUserMonth(userId: string, month: Date): Promise<IncomeSettlementEntity[]>;
  listForUser(userId: string): Promise<IncomeSettlementEntity[]>;
}

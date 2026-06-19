import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";

export interface IncomeSettlementRepositoryPort {
  upsert(settlement: IncomeSettlementEntity): Promise<void>;
  listForProfileMonth(profileId: string, month: Date): Promise<IncomeSettlementEntity[]>;
  listForProfile(profileId: string): Promise<IncomeSettlementEntity[]>;
}

import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";

export interface FinancialPlanningSettingsRepositoryPort {
  findByUser(userId: string): Promise<FinancialPlanningSettingsEntity | null>;
  upsertLiquidBucket(
    userId: string,
    liquidBucketAssetId: string | null,
  ): Promise<FinancialPlanningSettingsEntity>;
}

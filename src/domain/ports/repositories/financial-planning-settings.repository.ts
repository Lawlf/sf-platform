import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";

export interface FinancialPlanningSettingsRepositoryPort {
  findByProfile(profileId: string): Promise<FinancialPlanningSettingsEntity | null>;
  upsertLiquidBucket(
    profileId: string,
    liquidBucketAssetId: string | null,
  ): Promise<FinancialPlanningSettingsEntity>;
}

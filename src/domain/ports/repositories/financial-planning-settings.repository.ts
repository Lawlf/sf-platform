import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";

export interface FreeBalanceBucketUpdate {
  accumulatedCents: bigint;
  committedCoveredCents: bigint;
  currentBucketMonth: string;
}

export interface FinancialPlanningSettingsRepositoryPort {
  findByProfile(profileId: string): Promise<FinancialPlanningSettingsEntity | null>;
  upsertLiquidBucket(
    userId: string,
    profileId: string,
    liquidBucketAssetId: string | null,
  ): Promise<FinancialPlanningSettingsEntity>;
  upsertFreeBalanceBucket(
    userId: string,
    profileId: string,
    update: FreeBalanceBucketUpdate,
  ): Promise<FinancialPlanningSettingsEntity>;
}

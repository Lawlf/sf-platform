export interface FinancialPlanningSettingsEntity {
  userId: string;
  profileId: string;
  liquidBucketAssetId: string | null;
  freeBalanceAccumulatedCents: bigint;
  committedCoveredCents: bigint;
  currentBucketMonth: string | null;
  createdAt: Date;
  updatedAt: Date;
}

import { eq, sql } from "drizzle-orm";

import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";
import type {
  FinancialPlanningSettingsRepositoryPort,
  FreeBalanceBucketUpdate,
} from "@/domain/ports/repositories/financial-planning-settings.repository";

import { getDb } from "../client";
import {
  financialPlanningSettings,
  type FinancialPlanningSettingsRow,
} from "../schema/financial-planning-settings.schema";

function rowToEntity(row: FinancialPlanningSettingsRow): FinancialPlanningSettingsEntity {
  return {
    userId: row.userId,
    profileId: row.profileId,
    liquidBucketAssetId: row.liquidBucketAssetId ?? null,
    freeBalanceAccumulatedCents: row.freeBalanceAccumulatedCents,
    committedCoveredCents: row.committedCoveredCents,
    currentBucketMonth: row.currentBucketMonth ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class FinancialPlanningSettingsRepository
  implements FinancialPlanningSettingsRepositoryPort
{
  async findByProfile(profileId: string): Promise<FinancialPlanningSettingsEntity | null> {
    const rows = await getDb()
      .select()
      .from(financialPlanningSettings)
      .where(eq(financialPlanningSettings.profileId, profileId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return rowToEntity(row);
  }

  async upsertLiquidBucket(
    userId: string,
    profileId: string,
    liquidBucketAssetId: string | null,
  ): Promise<FinancialPlanningSettingsEntity> {
    const rows = await getDb()
      .insert(financialPlanningSettings)
      .values({ userId, profileId, liquidBucketAssetId })
      .onConflictDoUpdate({
        target: financialPlanningSettings.profileId,
        set: { liquidBucketAssetId, updatedAt: sql`now()` },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert financial planning settings");
    return rowToEntity(row);
  }

  async upsertFreeBalanceBucket(
    userId: string,
    profileId: string,
    update: FreeBalanceBucketUpdate,
  ): Promise<FinancialPlanningSettingsEntity> {
    const rows = await getDb()
      .insert(financialPlanningSettings)
      .values({
        userId,
        profileId,
        freeBalanceAccumulatedCents: update.accumulatedCents,
        committedCoveredCents: update.committedCoveredCents,
        currentBucketMonth: update.currentBucketMonth,
      })
      .onConflictDoUpdate({
        target: financialPlanningSettings.profileId,
        set: {
          freeBalanceAccumulatedCents: update.accumulatedCents,
          committedCoveredCents: update.committedCoveredCents,
          currentBucketMonth: update.currentBucketMonth,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert free balance bucket");
    return rowToEntity(row);
  }
}

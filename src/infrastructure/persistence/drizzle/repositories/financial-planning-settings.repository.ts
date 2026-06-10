import { eq, sql } from "drizzle-orm";

import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";
import type { FinancialPlanningSettingsRepositoryPort } from "@/domain/ports/repositories/financial-planning-settings.repository";

import { getDb } from "../client";
import {
  financialPlanningSettings,
  type FinancialPlanningSettingsRow,
} from "../schema/financial-planning-settings.schema";

function rowToEntity(row: FinancialPlanningSettingsRow): FinancialPlanningSettingsEntity {
  return {
    userId: row.userId,
    liquidBucketAssetId: row.liquidBucketAssetId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class FinancialPlanningSettingsRepository
  implements FinancialPlanningSettingsRepositoryPort
{
  async findByUser(userId: string): Promise<FinancialPlanningSettingsEntity | null> {
    const rows = await getDb()
      .select()
      .from(financialPlanningSettings)
      .where(eq(financialPlanningSettings.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return rowToEntity(row);
  }

  async upsertLiquidBucket(
    userId: string,
    liquidBucketAssetId: string | null,
  ): Promise<FinancialPlanningSettingsEntity> {
    const rows = await getDb()
      .insert(financialPlanningSettings)
      .values({ userId, liquidBucketAssetId })
      .onConflictDoUpdate({
        target: financialPlanningSettings.userId,
        set: { liquidBucketAssetId, updatedAt: sql`now()` },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert financial planning settings");
    return rowToEntity(row);
  }
}

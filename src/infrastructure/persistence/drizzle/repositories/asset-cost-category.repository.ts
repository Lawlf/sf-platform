import { and, eq } from "drizzle-orm";

import type { AssetCostCategory } from "@/domain/entities/asset-cost-category.entity";
import type { AssetCostCategoryRepositoryPort } from "@/domain/ports/repositories/asset-cost-category.repository";

import { getDb } from "../client";
import {
  assetCostCategories,
  type AssetCostCategoryRow,
} from "../schema/asset-cost-categories.schema";

function toEntity(row: AssetCostCategoryRow): AssetCostCategory {
  return {
    id: row.id,
    profileId: row.profileId,
    assetId: row.assetId,
    categoryKey: row.categoryKey,
    createdAt: row.createdAt,
  };
}

export class AssetCostCategoryRepository implements AssetCostCategoryRepositoryPort {
  async listByAsset(assetId: string, profileId: string): Promise<AssetCostCategory[]> {
    const rows = await getDb()
      .select()
      .from(assetCostCategories)
      .where(
        and(
          eq(assetCostCategories.assetId, assetId),
          eq(assetCostCategories.profileId, profileId),
        ),
      );
    return rows.map(toEntity);
  }

  async link(entity: AssetCostCategory): Promise<void> {
    await getDb()
      .insert(assetCostCategories)
      .values({
        id: entity.id,
        profileId: entity.profileId,
        assetId: entity.assetId,
        categoryKey: entity.categoryKey,
        createdAt: entity.createdAt,
      })
      .onConflictDoUpdate({
        target: [assetCostCategories.profileId, assetCostCategories.categoryKey],
        set: { assetId: entity.assetId },
      });
  }

  async unlink(profileId: string, categoryKey: string): Promise<void> {
    await getDb()
      .delete(assetCostCategories)
      .where(
        and(
          eq(assetCostCategories.profileId, profileId),
          eq(assetCostCategories.categoryKey, categoryKey),
        ),
      );
  }
}

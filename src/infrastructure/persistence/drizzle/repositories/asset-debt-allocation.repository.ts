import { and, eq, sql } from "drizzle-orm";

import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import { type Currency, Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import {
  assetDebtAllocations,
  type AssetDebtAllocationRow,
} from "../schema/asset-debt-allocations.schema";

function toEntity(row: AssetDebtAllocationRow): AssetDebtAllocation {
  return {
    id: row.id,
    assetId: row.assetId,
    debtId: row.debtId,
    allocationOriginal: Money.fromCents(row.allocationOriginalCents, row.currency as Currency),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class AssetDebtAllocationRepository implements AssetDebtAllocationRepositoryPort {
  async upsert(allocation: AssetDebtAllocation): Promise<void> {
    await getDb()
      .insert(assetDebtAllocations)
      .values({
        id: allocation.id,
        assetId: allocation.assetId,
        debtId: allocation.debtId,
        allocationOriginalCents: allocation.allocationOriginal.toCents(),
        currency: allocation.allocationOriginal.currency,
        createdAt: allocation.createdAt,
        updatedAt: allocation.updatedAt,
      })
      .onConflictDoUpdate({
        target: [assetDebtAllocations.assetId, assetDebtAllocations.debtId],
        set: {
          allocationOriginalCents: allocation.allocationOriginal.toCents(),
          currency: allocation.allocationOriginal.currency,
          updatedAt: allocation.updatedAt,
        },
      });
  }

  async delete(assetId: string, debtId: string): Promise<void> {
    await getDb()
      .delete(assetDebtAllocations)
      .where(
        and(eq(assetDebtAllocations.assetId, assetId), eq(assetDebtAllocations.debtId, debtId)),
      );
  }

  async deleteByDebtId(debtId: string): Promise<void> {
    await getDb().delete(assetDebtAllocations).where(eq(assetDebtAllocations.debtId, debtId));
  }

  async deleteByAssetId(assetId: string): Promise<void> {
    await getDb().delete(assetDebtAllocations).where(eq(assetDebtAllocations.assetId, assetId));
  }

  async findByAsset(assetId: string): Promise<AssetDebtAllocation[]> {
    const rows = await getDb()
      .select()
      .from(assetDebtAllocations)
      .where(eq(assetDebtAllocations.assetId, assetId));
    return rows.map(toEntity);
  }

  async findByDebt(debtId: string): Promise<AssetDebtAllocation[]> {
    const rows = await getDb()
      .select()
      .from(assetDebtAllocations)
      .where(eq(assetDebtAllocations.debtId, debtId));
    return rows.map(toEntity);
  }

  async sumAllocationsByDebt(debtId: string, excludeAssetId?: string): Promise<Money> {
    const condition = excludeAssetId
      ? and(
          eq(assetDebtAllocations.debtId, debtId),
          sql`${assetDebtAllocations.assetId} <> ${excludeAssetId}`,
        )
      : eq(assetDebtAllocations.debtId, debtId);
    const result = await getDb()
      .select({
        sum: sql<string>`COALESCE(SUM(${assetDebtAllocations.allocationOriginalCents}), 0)`,
      })
      .from(assetDebtAllocations)
      .where(condition);
    const sumStr = result[0]?.sum ?? "0";
    return Money.fromCents(BigInt(sumStr));
  }
}

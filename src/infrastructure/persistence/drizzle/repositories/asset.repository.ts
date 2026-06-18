import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";


import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type {
  AssetCategory,
  AssetEntity,
  AssetMetadata,
  DeactivationKind,
  DepreciationKind,
} from "@/domain/entities/asset.entity";
import type {
  AssetRepositoryPort,
  AssetWithAllocations,
} from "@/domain/ports/repositories/asset.repository";
import { type Currency, Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import { scopedToProfile } from "../helpers";
import {
  assetDebtAllocations,
  type AssetDebtAllocationRow,
} from "../schema/asset-debt-allocations.schema";
import { type AssetRow, assets } from "../schema/assets.schema";

/**
 * Normaliza o JSONB de metadata para o tipo do domínio. Em particular,
 * para investmentType "stocks", os campos de centavos (`avgPriceCents`,
 * `lastQuoteCents`) são guardados como string no JSONB (porque o driver
 * não consegue serializar `bigint`), então convertemos de volta aqui.
 * Também restaura `lastQuoteAt` como `Date` se vier como string ISO.
 */
function normalizeMetadata(raw: unknown): AssetMetadata | null {
  if (raw === null || raw === undefined) return null;
  const meta = raw as Record<string, unknown>;

  if (meta.kind === "cash") {
    const next: Record<string, unknown> = { ...meta };
    if (typeof meta.lastReviewedAt === "string") {
      const d = new Date(meta.lastReviewedAt);
      if (!Number.isNaN(d.getTime())) next.lastReviewedAt = d;
      else delete next.lastReviewedAt;
    }
    return next as unknown as AssetMetadata;
  }

  if (meta.kind !== "investment") return meta as unknown as AssetMetadata;

  const next: Record<string, unknown> = { ...meta };
  if (typeof meta.avgPriceCents === "string") {
    try {
      next.avgPriceCents = BigInt(meta.avgPriceCents);
    } catch {
      delete next.avgPriceCents;
    }
  } else if (typeof meta.avgPriceCents === "number") {
    next.avgPriceCents = BigInt(Math.round(meta.avgPriceCents));
  }
  if (typeof meta.lastQuoteCents === "string") {
    try {
      next.lastQuoteCents = BigInt(meta.lastQuoteCents);
    } catch {
      delete next.lastQuoteCents;
    }
  } else if (typeof meta.lastQuoteCents === "number") {
    next.lastQuoteCents = BigInt(Math.round(meta.lastQuoteCents));
  }
  if (typeof meta.lastQuoteAt === "string") {
    const d = new Date(meta.lastQuoteAt);
    if (!Number.isNaN(d.getTime())) next.lastQuoteAt = d;
  }
  return next as unknown as AssetMetadata;
}

/**
 * Inverso de `normalizeMetadata`: serializa o metadata para algo que o
 * driver de JSONB consiga gravar. Converte `bigint` para string e `Date`
 * para ISO.
 */
function serializeMetadata(meta: AssetMetadata | null): unknown {
  if (meta === null) return null;
  if (meta.kind === "cash") {
    const out: Record<string, unknown> = { ...meta };
    if (meta.lastReviewedAt instanceof Date) {
      out.lastReviewedAt = meta.lastReviewedAt.toISOString();
    }
    return out;
  }
  if (meta.kind !== "investment") return meta;
  const out: Record<string, unknown> = { ...meta };
  if (typeof meta.avgPriceCents === "bigint") {
    out.avgPriceCents = meta.avgPriceCents.toString();
  }
  if (typeof meta.lastQuoteCents === "bigint") {
    out.lastQuoteCents = meta.lastQuoteCents.toString();
  }
  if (meta.lastQuoteAt instanceof Date) {
    out.lastQuoteAt = meta.lastQuoteAt.toISOString();
  }
  return out;
}

const DEACTIVATION_KINDS: readonly DeactivationKind[] = [
  "sold",
  "lost",
  "donated",
  "not_specified",
];

function parseDeactivationKind(raw: string | null): DeactivationKind | null {
  if (raw === null) return null;
  return (DEACTIVATION_KINDS as readonly string[]).includes(raw) ? (raw as DeactivationKind) : null;
}

function toEntity(row: AssetRow): AssetEntity {
  return {
    id: row.id,
    userId: row.userId,
    profileId: row.profileId,
    category: row.category as AssetCategory,
    label: row.label,
    currentValue: Money.fromCents(row.currentValueCents, row.currency as Currency),
    anchorAt: row.anchorAt,
    metadata: normalizeMetadata(row.metadata),
    fipeCode: row.fipeCode,
    fipeLastSyncedAt: row.fipeLastSyncedAt,
    acquiredAt: row.acquiredAt,
    depreciationKind: row.depreciationKind as DepreciationKind,
    depreciationRatePctYear: Number.parseFloat(row.depreciationRatePctYear),
    purchaseDate: row.purchaseDate ?? null,
    purchasePriceCents: row.purchasePriceCents ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deactivatedAt: row.deactivatedAt,
    deactivationKind: parseDeactivationKind(row.deactivationKind),
    salePriceCents: row.salePriceCents ?? null,
    deactivationReason: row.deactivationReason,
    deletedAt: row.deletedAt ?? null,
    externalAccountKey: row.externalAccountKey ?? null,
  };
}

function allocationToEntity(row: AssetDebtAllocationRow): AssetDebtAllocation {
  return {
    id: row.id,
    assetId: row.assetId,
    debtId: row.debtId,
    allocationOriginal: Money.fromCents(row.allocationOriginalCents, row.currency as Currency),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class AssetRepository implements AssetRepositoryPort {
  async create(asset: AssetEntity): Promise<void> {
    await getDb()
      .insert(assets)
      .values({
        id: asset.id,
        userId: asset.userId,
        profileId: asset.profileId,
        category: asset.category,
        label: asset.label,
        currentValueCents: asset.currentValue.toCents(),
        currency: asset.currentValue.currency,
        anchorAt: asset.anchorAt,
        metadata: serializeMetadata(asset.metadata),
        fipeCode: asset.fipeCode,
        fipeLastSyncedAt: asset.fipeLastSyncedAt,
        acquiredAt: asset.acquiredAt,
        depreciationKind: asset.depreciationKind,
        depreciationRatePctYear: asset.depreciationRatePctYear.toFixed(2),
        purchaseDate: asset.purchaseDate,
        purchasePriceCents: asset.purchasePriceCents,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        deactivatedAt: asset.deactivatedAt,
        deactivationKind: asset.deactivationKind,
        salePriceCents: asset.salePriceCents,
        deactivationReason: asset.deactivationReason,
        deletedAt: asset.deletedAt,
        externalAccountKey: asset.externalAccountKey ?? null,
      })
      // Idempotente: em uma corrida de double-commit do OFX o segundo insert da
      // mesma conta bancária colide no índice único parcial por
      // external_account_key e vira no-op (ativos manuais têm chave nula e nunca
      // colidem). O caller do OFX re-busca pela chave para resolver o id vencedor.
      .onConflictDoNothing();
  }

  async createDefaultWallet(asset: AssetEntity): Promise<void> {
    await getDb()
      .insert(assets)
      .values({
        id: asset.id,
        userId: asset.userId,
        profileId: asset.profileId,
        category: asset.category,
        label: asset.label,
        currentValueCents: asset.currentValue.toCents(),
        currency: asset.currentValue.currency,
        anchorAt: asset.anchorAt,
        metadata: serializeMetadata(asset.metadata),
        fipeCode: asset.fipeCode,
        fipeLastSyncedAt: asset.fipeLastSyncedAt,
        acquiredAt: asset.acquiredAt,
        depreciationKind: asset.depreciationKind,
        depreciationRatePctYear: asset.depreciationRatePctYear.toFixed(2),
        purchaseDate: asset.purchaseDate,
        purchasePriceCents: asset.purchasePriceCents,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        deactivatedAt: asset.deactivatedAt,
        deactivationKind: asset.deactivationKind,
        salePriceCents: asset.salePriceCents,
        deactivationReason: asset.deactivationReason,
        deletedAt: asset.deletedAt,
        externalAccountKey: asset.externalAccountKey ?? null,
      })
      .onConflictDoNothing();
  }

  async update(asset: AssetEntity): Promise<void> {
    await getDb()
      .update(assets)
      .set({
        category: asset.category,
        label: asset.label,
        currentValueCents: asset.currentValue.toCents(),
        currency: asset.currentValue.currency,
        anchorAt: asset.anchorAt,
        metadata: serializeMetadata(asset.metadata),
        fipeCode: asset.fipeCode,
        fipeLastSyncedAt: asset.fipeLastSyncedAt,
        acquiredAt: asset.acquiredAt,
        depreciationKind: asset.depreciationKind,
        depreciationRatePctYear: asset.depreciationRatePctYear.toFixed(2),
        purchaseDate: asset.purchaseDate,
        purchasePriceCents: asset.purchasePriceCents,
        updatedAt: asset.updatedAt,
        deactivatedAt: asset.deactivatedAt,
        deactivationKind: asset.deactivationKind,
        salePriceCents: asset.salePriceCents,
        deactivationReason: asset.deactivationReason,
        externalAccountKey: asset.externalAccountKey ?? null,
      })
      .where(eq(assets.id, asset.id));
  }

  async findById(id: string, profileId: string): Promise<AssetEntity | null> {
    const rows = await getDb()
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), scopedToProfile(assets, profileId)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findActiveByProfile(profileId: string): Promise<AssetEntity[]> {
    const rows = await getDb()
      .select()
      .from(assets)
      .where(
        and(eq(assets.profileId, profileId), isNull(assets.deactivatedAt), isNull(assets.deletedAt)),
      );
    return rows.map(toEntity);
  }

  async findActiveByProfileAndCategory(
    profileId: string,
    category: AssetCategory,
  ): Promise<AssetEntity[]> {
    const rows = await getDb()
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.profileId, profileId),
          eq(assets.category, category),
          isNull(assets.deactivatedAt),
          isNull(assets.deletedAt),
        ),
      );
    return rows.map(toEntity);
  }

  async findByIdWithAllocations(id: string, profileId: string): Promise<AssetWithAllocations | null> {
    const asset = await this.findById(id, profileId);
    if (!asset) return null;
    const allocs = await getDb()
      .select()
      .from(assetDebtAllocations)
      .where(eq(assetDebtAllocations.assetId, id));
    return { asset, allocations: allocs.map(allocationToEntity) };
  }

  async findActiveWithAllocations(profileId: string): Promise<AssetWithAllocations[]> {
    const activeAssets = await this.findActiveByProfile(profileId);
    if (activeAssets.length === 0) return [];
    const assetIds = activeAssets.map((a) => a.id);
    const allocs = await getDb()
      .select()
      .from(assetDebtAllocations)
      .where(inArray(assetDebtAllocations.assetId, assetIds));
    const byAsset = new Map<string, AssetDebtAllocation[]>();
    for (const a of allocs) {
      const list = byAsset.get(a.assetId) ?? [];
      list.push(allocationToEntity(a));
      byAsset.set(a.assetId, list);
    }
    return activeAssets.map((asset) => ({
      asset,
      allocations: byAsset.get(asset.id) ?? [],
    }));
  }

  async listStockTickersForProfile(profileId: string): Promise<string[]> {
    const rows = await this.findActiveByProfileAndCategory(profileId, "investment");
    const tickers = new Set<string>();
    for (const a of rows) {
      const meta = a.metadata;
      if (meta && meta.kind === "investment" && meta.investmentType === "stocks") {
        const t = typeof meta.ticker === "string" ? meta.ticker.trim().toUpperCase() : "";
        if (t.length > 0) tickers.add(t);
      }
    }
    return Array.from(tickers).sort();
  }

  async listCryptoTickersForProfile(profileId: string): Promise<string[]> {
    const rows = await this.findActiveByProfileAndCategory(profileId, "investment");
    const tickers = new Set<string>();
    for (const a of rows) {
      const meta = a.metadata;
      if (meta && meta.kind === "investment" && meta.investmentType === "crypto") {
        const t = typeof meta.ticker === "string" ? meta.ticker.trim().toUpperCase() : "";
        if (t.length > 0) tickers.add(t);
      }
    }
    return Array.from(tickers).sort();
  }

  async softDelete(id: string, deletedAt: Date): Promise<void> {
    await getDb().update(assets).set({ deletedAt, updatedAt: deletedAt }).where(eq(assets.id, id));
  }

  async findByExternalAccountKey(profileId: string, key: string): Promise<AssetEntity | null> {
    const rows = await getDb()
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.profileId, profileId),
          eq(assets.externalAccountKey, key),
          isNull(assets.deletedAt),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toEntity(row) : null;
  }

  async listExternalAccountKeys(profileId: string): Promise<string[]> {
    const rows = await getDb()
      .select({ key: assets.externalAccountKey })
      .from(assets)
      .where(and(eq(assets.profileId, profileId), isNotNull(assets.externalAccountKey), isNull(assets.deletedAt)));
    return rows.map((r) => r.key).filter((v): v is string => v !== null);
  }
}

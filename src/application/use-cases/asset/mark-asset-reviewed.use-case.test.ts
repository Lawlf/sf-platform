import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { AssetDeactivated, AssetNotCash, AssetNotFound } from "@/domain/errors/asset-errors";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { markAssetReviewed } from "./mark-asset-reviewed.use-case";

function makeAssetRepo(): AssetRepository {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-20T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
    category: "cash",
    label: "Reserva Nubank",
    currentValue: Money.fromCents(50_000_00n),
    metadata: {
      kind: "cash",
      institution: "Nubank",
      yieldType: "cdi",
      yieldRatePct: 110,
    },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("markAssetReviewed", () => {
  it("bumps lastReviewedAt and updatedAt without changing balance", async () => {
    const assets = makeAssetRepo();
    const now = new Date("2026-05-20T10:00:00Z");
    const clock = makeClock(now);
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await markAssetReviewed(
      { assets, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata?.kind).toBe("cash");
      if (result.value.metadata?.kind === "cash") {
        expect(result.value.metadata.lastReviewedAt).toEqual(now);
        expect(result.value.metadata.yieldRatePct).toBe(110);
        expect(result.value.metadata.institution).toBe("Nubank");
      }
      expect(result.value.currentValue.toCents()).toBe(50_000_00n);
      expect(result.value.updatedAt).toEqual(now);
    }
    expect(assets.update).toHaveBeenCalledTimes(1);
  });

  it("returns AssetNotFound when asset does not exist for user", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await markAssetReviewed(
      { assets, clock },
      { userId: "user-1", assetId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
    expect(assets.update).not.toHaveBeenCalled();
  });

  it("returns AssetDeactivated when asset is archived", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({
        deactivatedAt: new Date("2026-01-15"),
        deactivationReason: "Encerrado",
      }),
    );

    const result = await markAssetReviewed(
      { assets, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetDeactivated);
    }
    expect(assets.update).not.toHaveBeenCalled();
  });

  it("returns AssetNotCash when asset is not cash kind", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({
        category: "vehicle",
        metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2020 },
      }),
    );

    const result = await markAssetReviewed(
      { assets, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotCash);
    }
    expect(assets.update).not.toHaveBeenCalled();
  });
});

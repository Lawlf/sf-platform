import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { AssetNotFound } from "@/domain/errors/asset-errors";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { deleteAsset } from "./delete-asset.use-case";

function makeAssetRepo(): AssetRepositoryPort {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(),
    createDefaultWallet: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    listCryptoTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };
}

function makeAllocRepo(): AssetDebtAllocationRepositoryPort {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-21T10:00:00Z")): Clock {
  return { now: vi.fn(() => now) };
}

function makeAsset(userId = "user-1"): AssetEntity {
  return {
    id: "asset-1",
    userId,
    category: "vehicle",
    label: "Civic",
    currentValue: Money.fromCents(5_000_000n),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

describe("deleteAsset", () => {
  it("hard-deletes allocations and soft-deletes the asset for the owner", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const now = new Date("2026-05-21T10:00:00Z");
    const clock = makeClock(now);
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset("user-1"));

    const result = await deleteAsset(
      { assets, allocations, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(result)).toBe(true);
    expect(allocations.deleteByAssetId).toHaveBeenCalledWith("asset-1");
    expect(assets.softDelete).toHaveBeenCalledWith("asset-1", now);
    // Ordem: limpa allocations antes de marcar o ativo como apagado.
    const allocOrder = (allocations.deleteByAssetId as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const assetOrder = (assets.softDelete as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(allocOrder).toBeDefined();
    expect(assetOrder).toBeDefined();
    if (allocOrder !== undefined && assetOrder !== undefined) {
      expect(allocOrder).toBeLessThan(assetOrder);
    }
  });

  it("returns AssetNotFound when asset does not exist", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await deleteAsset(
      { assets, allocations, clock },
      { userId: "user-1", assetId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
    expect(allocations.deleteByAssetId).not.toHaveBeenCalled();
    expect(assets.softDelete).not.toHaveBeenCalled();
  });

  it("returns AssetNotFound when asset belongs to another user (findById scoped by userId)", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const clock = makeClock();
    // findById takes userId; repo scoping returns null when not owned.
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await deleteAsset(
      { assets, allocations, clock },
      { userId: "intruder", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
    expect(allocations.deleteByAssetId).not.toHaveBeenCalled();
    expect(assets.softDelete).not.toHaveBeenCalled();
  });

  it("returns Forbidden when stored userId differs from caller (defense in depth)", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const clock = makeClock();
    // Hypothetical case: findById returned an asset (would not normally
    // happen since findById is scoped by userId), but the stored userId
    // does not match. The use case still rejects.
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset("owner"));

    const result = await deleteAsset(
      { assets, allocations, clock },
      { userId: "intruder", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(allocations.deleteByAssetId).not.toHaveBeenCalled();
    expect(assets.softDelete).not.toHaveBeenCalled();
  });

  it("clears allocations even when there are no allocations on this asset (idempotent)", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset("user-1"));

    const result = await deleteAsset(
      { assets, allocations, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(result)).toBe(true);
    expect(allocations.deleteByAssetId).toHaveBeenCalledTimes(1);
    expect(assets.softDelete).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { AssetNotFound } from "@/domain/errors/asset-errors";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { unlinkAssetFromDebt } from "./unlink-asset-from-debt.use-case";

function makeAssetRepo(): AssetRepository {
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
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };
}

function makeAllocRepo(): AssetDebtAllocationRepository {
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

function makeAsset(): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
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
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

describe("unlinkAssetFromDebt", () => {
  it("calls allocations.delete with the (assetId, debtId) pair for the owner", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await unlinkAssetFromDebt(
      { assets, allocations },
      { userId: "user-1", assetId: "asset-1", debtId: "debt-1" },
    );

    expect(isOk(result)).toBe(true);
    expect(allocations.delete).toHaveBeenCalledWith("asset-1", "debt-1");
  });

  it("is a no-op success when the allocation does not exist (delete is idempotent)", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    (allocations.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await unlinkAssetFromDebt(
      { assets, allocations },
      { userId: "user-1", assetId: "asset-1", debtId: "never-linked-debt" },
    );

    expect(isOk(result)).toBe(true);
    expect(allocations.delete).toHaveBeenCalledTimes(1);
  });

  it("returns AssetNotFound when asset is not owned by user", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await unlinkAssetFromDebt(
      { assets, allocations },
      { userId: "intruder", assetId: "asset-1", debtId: "debt-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
    expect(allocations.delete).not.toHaveBeenCalled();
  });
});

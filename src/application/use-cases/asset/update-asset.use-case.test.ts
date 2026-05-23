import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetMetadataMismatch,
  AssetNotFound,
  InvalidAssetLabel,
  InvalidAssetValue,
} from "@/domain/errors/asset-errors";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { updateAsset } from "./update-asset.use-case";

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

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
    category: "vehicle",
    label: "Civic 2020",
    currentValue: Money.fromCents(8_000_000n),
    metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2020 },
    fipeCode: "001",
    fipeLastSyncedAt: null,
    acquiredAt: new Date("2025-01-01"),
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

describe("updateAsset", () => {
  it("applies partial updates and bumps updatedAt", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock(new Date("2026-06-01T00:00:00Z"));
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await updateAsset(
      { assets, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        label: "Civic 2020 atualizado",
        currentValueCents: 7_500_000n,
        fipeCode: "002",
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.label).toBe("Civic 2020 atualizado");
      expect(result.value.currentValue.toCents()).toBe(7_500_000n);
      expect(result.value.fipeCode).toBe("002");
      expect(result.value.updatedAt).toEqual(new Date("2026-06-01T00:00:00Z"));
    }
    expect(assets.update).toHaveBeenCalledTimes(1);
  });

  it("returns AssetNotFound when repository returns null (scoped by userId)", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await updateAsset(
      { assets, clock },
      { userId: "user-1", assetId: "missing", label: "x" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
    expect(assets.update).not.toHaveBeenCalled();
  });

  it("returns AssetDeactivated when asset is deactivated", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({
        deactivatedAt: new Date("2026-01-15"),
        deactivationReason: "Vendido",
      }),
    );

    const result = await updateAsset(
      { assets, clock },
      { userId: "user-1", assetId: "asset-1", label: "novo" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetDeactivated);
    }
  });

  it("rejects label whose trim is empty", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await updateAsset(
      { assets, clock },
      { userId: "user-1", assetId: "asset-1", label: "   " },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAssetLabel);
    }
  });

  it("rejects negative currentValueCents", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await updateAsset(
      { assets, clock },
      { userId: "user-1", assetId: "asset-1", currentValueCents: -100n },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAssetValue);
    }
  });

  it("rejects metadata.kind that mismatches existing category", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await updateAsset(
      { assets, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        metadata: { kind: "real_estate", addressCity: "Rio" },
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetMetadataMismatch);
    }
  });

  it("allows clearing metadata to null", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await updateAsset(
      { assets, clock },
      { userId: "user-1", assetId: "asset-1", metadata: null },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toBeNull();
    }
  });
});

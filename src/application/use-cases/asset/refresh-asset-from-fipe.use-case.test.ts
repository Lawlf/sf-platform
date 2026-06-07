import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetFipeNotApplicable,
  AssetFipeRefreshFailed,
  AssetNotFound,
} from "@/domain/errors/asset-errors";
import type { FipeClient, FipeVehicleData } from "@/domain/ports/external/fipe-client.port";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { refreshAssetFromFipe } from "./refresh-asset-from-fipe.use-case";

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
    category: "vehicle",
    label: "Civic",
    currentValue: Money.fromCents(5_000_000n),
    metadata: {
      kind: "vehicle",
      brand: "Honda",
      model: "Civic LX 1.7",
      year: 2003,
    },
    fipeCode: "21/4828/2003-1",
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...overrides,
  };
}

function makeRepoBackedByMap() {
  const store = new Map<string, AssetEntity>();
  const repo: AssetRepository = {
    create: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    update: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    findById: vi.fn(async (id: string, userId: string) => {
      const a = store.get(id);
      return a && a.userId === userId ? a : null;
    }),
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
  return { repo, store };
}

function makeFipe(overrides: Partial<FipeClient> = {}): FipeClient {
  return {
    listBrands: vi.fn(),
    listModels: vi.fn(),
    listYears: vi.fn(),
    getVehicleValue: vi.fn(),
    ...overrides,
  };
}

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeFipeData(overrides: Partial<FipeVehicleData> = {}): FipeVehicleData {
  return {
    fipeCode: "21/4828/2003-1",
    brand: "Honda",
    model: "Civic LX 1.7 16V 130cv Mec.",
    year: 2003,
    value: Money.fromCents(8_950_000n),
    referenceMonth: "Maio de 2026",
    ...overrides,
  };
}

describe("refreshAssetFromFipe", () => {
  it("updates currentValue and fipeLastSyncedAt on success", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const fipeData = makeFipeData({ value: Money.fromCents(8_950_000n) });
    const fipe = makeFipe({
      getVehicleValue: vi.fn(async () => fipeData),
    });
    const now = new Date("2026-06-01T12:00:00Z");
    const clock = makeClock(now);

    const result = await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.asset.currentValue.toCents()).toBe(8_950_000n);
      expect(result.value.asset.fipeLastSyncedAt).toEqual(now);
      expect(result.value.asset.updatedAt).toEqual(now);
    }
    expect(fipe.getVehicleValue).toHaveBeenCalledWith("21/4828/2003-1");
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("returns AssetNotFound when asset does not exist", async () => {
    const { repo } = makeRepoBackedByMap();
    const fipe = makeFipe();
    const clock = makeClock();

    const result = await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "user-1", assetId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
    expect(fipe.getVehicleValue).not.toHaveBeenCalled();
  });

  it("returns AssetNotFound when asset belongs to another user", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset({ userId: "owner" }));
    const fipe = makeFipe();
    const clock = makeClock();

    const result = await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "intruder", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
  });

  it("returns AssetDeactivated when asset is deactivated", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeAsset({
        deactivatedAt: new Date("2026-01-01"),
        deactivationReason: "Vendido",
      }),
    );
    const fipe = makeFipe();
    const clock = makeClock();

    const result = await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetDeactivated);
    }
    expect(fipe.getVehicleValue).not.toHaveBeenCalled();
  });

  it("returns AssetFipeNotApplicable when category is not vehicle", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeAsset({
        category: "real_estate",
        metadata: { kind: "real_estate", addressCity: "Sao Paulo" },
        fipeCode: null,
      }),
    );
    const fipe = makeFipe();
    const clock = makeClock();

    const result = await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetFipeNotApplicable);
    }
    expect(fipe.getVehicleValue).not.toHaveBeenCalled();
  });

  it("returns AssetFipeNotApplicable when vehicle has no fipeCode", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset({ fipeCode: null }));
    const fipe = makeFipe();
    const clock = makeClock();

    const result = await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetFipeNotApplicable);
    }
    expect(fipe.getVehicleValue).not.toHaveBeenCalled();
  });

  it("returns AssetFipeRefreshFailed when FIPE client throws", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const fipe = makeFipe({
      getVehicleValue: vi.fn(async () => {
        throw new Error("FIPE HTTP 503");
      }),
    });
    const clock = makeClock();

    const result = await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetFipeRefreshFailed);
      expect((result.error as AssetFipeRefreshFailed).reason).toContain("FIPE HTTP 503");
    }
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("does not call repo.update when FIPE fetch fails", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const fipe = makeFipe({
      getVehicleValue: vi.fn(async () => {
        throw new Error("timeout");
      }),
    });
    const clock = makeClock();

    await refreshAssetFromFipe(
      { assets: repo, fipe, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(repo.update).not.toHaveBeenCalled();
  });
});

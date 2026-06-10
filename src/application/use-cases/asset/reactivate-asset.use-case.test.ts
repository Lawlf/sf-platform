import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import { AssetAlreadyActive, AssetNotFound } from "@/domain/errors/asset-errors";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { deactivateAsset } from "./deactivate-asset.use-case";
import { reactivateAsset } from "./reactivate-asset.use-case";

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
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
  const repo: AssetRepositoryPort = {
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

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

describe("reactivateAsset", () => {
  it("clears deactivatedAt + deactivationReason and bumps updatedAt", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeAsset({
        deactivatedAt: new Date("2026-01-15"),
        deactivationReason: "Vendido",
      }),
    );
    const clock = makeClock(new Date("2026-07-01T00:00:00Z"));

    const result = await reactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.deactivatedAt).toBeNull();
      expect(result.value.deactivationReason).toBeNull();
      expect(result.value.updatedAt).toEqual(new Date("2026-07-01T00:00:00Z"));
      expect(isAssetActive(result.value)).toBe(true);
    }
  });

  it("returns AssetNotFound when asset belongs to another user", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeAsset({
        userId: "owner",
        deactivatedAt: new Date("2026-01-15"),
        deactivationReason: "x",
      }),
    );
    const clock = makeClock();

    const result = await reactivateAsset(
      { assets: repo, clock },
      { userId: "intruder", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
  });

  it("returns AssetAlreadyActive when asset is already active", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await reactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetAlreadyActive);
    }
  });

  it("deactivate then reactivate restores active state (LGPD round trip)", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());

    const deactClock = makeClock(new Date("2026-02-01T00:00:00Z"));
    const deact = await deactivateAsset(
      { assets: repo, clock: deactClock },
      {
        userId: "user-1",
        assetId: "asset-1",
        kind: "not_specified",
        reason: "Em manutencao",
      },
    );
    expect(isOk(deact)).toBe(true);

    const reactClock = makeClock(new Date("2026-03-01T00:00:00Z"));
    const react = await reactivateAsset(
      { assets: repo, clock: reactClock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(react)).toBe(true);
    if (isOk(react)) {
      expect(react.value.deactivatedAt).toBeNull();
      expect(react.value.deactivationReason).toBeNull();
      expect(isAssetActive(react.value)).toBe(true);
    }
  });
});

import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import {
  AssetAlreadyDeactivated,
  AssetNotFound,
  InvalidAssetValue,
  InvalidDeactivationReason,
} from "@/domain/errors/asset-errors";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { deactivateAsset } from "./deactivate-asset.use-case";

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
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
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
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
  };
  return { repo, store };
}

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

describe("deactivateAsset", () => {
  it("marks asset deactivated with kind=sold + sale price", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock(new Date("2026-06-01T00:00:00Z"));

    const result = await deactivateAsset(
      { assets: repo, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        kind: "sold",
        salePriceCents: 4_500_000n,
        reason: "Vendi na OLX",
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.deactivatedAt).toEqual(new Date("2026-06-01T00:00:00Z"));
      expect(result.value.deactivationKind).toBe("sold");
      expect(result.value.salePriceCents).toBe(4_500_000n);
      expect(result.value.deactivationReason).toBe("Vendi na OLX");
      expect(result.value.updatedAt).toEqual(new Date("2026-06-01T00:00:00Z"));
    }
  });

  it("marks asset deactivated with kind=lost and no sale price", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "lost" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.deactivationKind).toBe("lost");
      expect(result.value.salePriceCents).toBeNull();
      expect(result.value.deactivationReason).toBeNull();
    }
  });

  it("marks asset deactivated with kind=donated", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "donated", reason: "Doei pra ONG" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.deactivationKind).toBe("donated");
      expect(result.value.salePriceCents).toBeNull();
      expect(result.value.deactivationReason).toBe("Doei pra ONG");
    }
  });

  it("marks asset deactivated with kind=not_specified", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "not_specified" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.deactivationKind).toBe("not_specified");
    }
  });

  it("ignores salePriceCents when kind !== sold", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        kind: "donated",
        salePriceCents: 999n,
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.salePriceCents).toBeNull();
    }
  });

  it("rejects kind=sold without salePriceCents", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "sold" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAssetValue);
    }
  });

  it("rejects kind=sold with negative salePriceCents", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "sold", salePriceCents: -1n },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAssetValue);
    }
  });

  it("LGPD invariant: deactivated asset stays findable, never deleted", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "sold", salePriceCents: 100n },
    );

    const found = await repo.findById("asset-1", "user-1");
    expect(found).not.toBeNull();
    expect(found?.deactivatedAt).not.toBeNull();
    expect(store.has("asset-1")).toBe(true);
  });

  it("returns AssetNotFound when asset belongs to another user", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset({ userId: "owner" }));
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "intruder", assetId: "asset-1", kind: "lost" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
  });

  it("returns AssetAlreadyDeactivated when asset is already deactivated", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeAsset({
        deactivatedAt: new Date("2026-01-01"),
        deactivationKind: "sold",
      }),
    );
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "lost" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetAlreadyDeactivated);
    }
  });

  it("rejects notes longer than 500 chars", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        kind: "lost",
        reason: "x".repeat(501),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidDeactivationReason);
    }
  });

  it("treats whitespace-only notes as null (notes are optional now)", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeAsset());
    const clock = makeClock();

    const result = await deactivateAsset(
      { assets: repo, clock },
      { userId: "user-1", assetId: "asset-1", kind: "lost", reason: "   " },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.deactivationReason).toBeNull();
    }
  });
});

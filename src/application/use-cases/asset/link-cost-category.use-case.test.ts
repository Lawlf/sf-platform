import { describe, expect, it, vi } from "vitest";

import type { AssetCostCategory } from "@/domain/entities/asset-cost-category.entity";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { linkCostCategory } from "./link-cost-category.use-case";

function asset(over: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "a1",
    userId: "u1",
    profileId: "p1",
    category: "vehicle",
    label: "Carro",
    currentValue: Money.fromCents(4000000n),
    metadata: { kind: "vehicle" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "depreciating",
    depreciationRatePctYear: 10,
    purchaseDate: null,
    purchasePriceCents: null,
    monthlyCostEstimateCents: null,
    anchorAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    ...over,
  } as AssetEntity;
}

function makeDeps(found: AssetEntity | null) {
  const linked: AssetCostCategory[] = [];
  return {
    linked,
    deps: {
      costCategories: {
        link: vi.fn(async (e: AssetCostCategory) => {
          linked.push(e);
        }),
      },
      assets: { findById: vi.fn(async () => found) },
      clock: { now: () => new Date("2026-06-21T00:00:00Z") },
    },
  };
}

describe("linkCostCategory", () => {
  it("liga a categoria ao bem", async () => {
    const { deps, linked } = makeDeps(asset());
    const res = await linkCostCategory(deps, {
      profileId: "p1",
      assetId: "a1",
      categoryKey: "transporte",
    });
    expect(isOk(res)).toBe(true);
    expect(linked[0]!.categoryKey).toBe("transporte");
    expect(linked[0]!.assetId).toBe("a1");
  });

  it("nega quando o bem não é do perfil", async () => {
    const { deps } = makeDeps(asset({ profileId: "outro" }));
    const res = await linkCostCategory(deps, {
      profileId: "p1",
      assetId: "a1",
      categoryKey: "transporte",
    });
    expect(isErr(res)).toBe(true);
  });

  it("nega quando o bem não existe", async () => {
    const { deps } = makeDeps(null);
    const res = await linkCostCategory(deps, {
      profileId: "p1",
      assetId: "x",
      categoryKey: "transporte",
    });
    expect(isErr(res)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { resolveAssetMonthlyRate } from "./asset-rate";
import { buildProjectionAssetInputs } from "./build-projection-asset-inputs";

function asset(p: Partial<AssetEntity> & Pick<AssetEntity, "id" | "metadata">): AssetEntity {
  return {
    userId: "u1", profileId: "profile-1", category: "cash", label: "x", currentValue: Money.fromCents(100000n),
    fipeCode: null, fipeLastSyncedAt: null, acquiredAt: null, depreciationKind: "stable",
    depreciationRatePctYear: 0, purchaseDate: null, purchasePriceCents: null,
    createdAt: new Date(0), updatedAt: new Date(0), anchorAt: null, deactivatedAt: null, deactivationKind: null,
    salePriceCents: null, deactivationReason: null, deletedAt: null, externalAccountKey: null, ...p,
  };
}

describe("buildProjectionAssetInputs", () => {
  it("maps each asset to value cents and its resolved monthly growth rate", () => {
    const a = asset({
      id: "cdb",
      currentValue: Money.fromCents(500000n),
      metadata: { kind: "cash", yieldType: "fixed_pct_year", yieldRatePct: 10 },
    });
    const [input] = buildProjectionAssetInputs([a]);
    expect(input).toEqual({
      assetId: "cdb",
      valueCents: 500000n,
      monthlyGrowthRate: resolveAssetMonthlyRate(a),
    });
  });

  it("preserves order and maps every asset", () => {
    const a = asset({ id: "a", metadata: { kind: "cash", yieldType: "none" } });
    const b = asset({ id: "b", category: "vehicle", depreciationRatePctYear: 20, metadata: { kind: "vehicle", brand: "x", model: "y", year: 2020 } });
    const result = buildProjectionAssetInputs([a, b]);
    expect(result.map((r) => r.assetId)).toEqual(["a", "b"]);
    expect(result[1]!.monthlyGrowthRate).toBeLessThan(0);
  });

  it("returns an empty array for no assets", () => {
    expect(buildProjectionAssetInputs([])).toEqual([]);
  });
});

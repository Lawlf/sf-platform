import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import {
  DEFAULT_CDI_ANNUAL_PCT,
  annualPctToMonthlyRate,
  resolveAssetMonthlyRate,
  resolveLiquidBucketRate,
} from "./asset-rate";

function asset(partial: Partial<AssetEntity> & Pick<AssetEntity, "metadata">): AssetEntity {
  return {
    id: "a1",
    userId: "u1",
    category: "cash",
    label: "Reserva",
    currentValue: Money.fromCents(0n),
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...partial,
  };
}

describe("annualPctToMonthlyRate", () => {
  it("converts an annual percentage to a monthly compounding decimal", () => {
    expect(annualPctToMonthlyRate(12)).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 10);
    expect(annualPctToMonthlyRate(0)).toBe(0);
  });
});

describe("resolveAssetMonthlyRate", () => {
  it("fixed_pct_year cash yields its annual rate converted to monthly", () => {
    const a = asset({ category: "cash", metadata: { kind: "cash", yieldType: "fixed_pct_year", yieldRatePct: 10 } });
    expect(resolveAssetMonthlyRate(a)).toBeCloseTo(annualPctToMonthlyRate(10), 12);
  });

  it("cdi cash resolves against DEFAULT_CDI_ANNUAL_PCT", () => {
    const a = asset({ category: "cash", metadata: { kind: "cash", yieldType: "cdi", yieldRatePct: 100 } });
    expect(resolveAssetMonthlyRate(a)).toBeCloseTo(annualPctToMonthlyRate(DEFAULT_CDI_ANNUAL_PCT), 12);
  });

  it("none/no-yield cash is zero", () => {
    const a = asset({ category: "cash", metadata: { kind: "cash", yieldType: "none" } });
    expect(resolveAssetMonthlyRate(a)).toBe(0);
  });

  it("depreciating non-cash asset yields a negative monthly rate", () => {
    const a = asset({ category: "vehicle", depreciationRatePctYear: 20, metadata: { kind: "vehicle", brand: "x", model: "y", year: 2020 } });
    const expected = Math.pow(1 - 20 / 100, 1 / 12) - 1;
    expect(resolveAssetMonthlyRate(a)).toBeCloseTo(expected, 12);
    expect(resolveAssetMonthlyRate(a)).toBeLessThan(0);
  });

  it("appreciating asset (negative depreciation) yields a positive monthly rate", () => {
    const a = asset({ category: "real_estate", depreciationRatePctYear: -5, metadata: { kind: "real_estate", addressCity: "SP" } });
    expect(resolveAssetMonthlyRate(a)).toBeGreaterThan(0);
  });

  it("stable asset is zero", () => {
    const a = asset({ category: "other", depreciationRatePctYear: 0, metadata: { kind: "other" } });
    expect(resolveAssetMonthlyRate(a)).toBe(0);
  });
});

describe("resolveLiquidBucketRate", () => {
  it("returns the designated bucket asset's rate", () => {
    const bucket = asset({ id: "buck", metadata: { kind: "cash", yieldType: "fixed_pct_year", yieldRatePct: 8 } });
    expect(resolveLiquidBucketRate([bucket], "buck")).toBeCloseTo(annualPctToMonthlyRate(8), 12);
  });

  it("returns 0 when the bucket id is null or not found", () => {
    const bucket = asset({ id: "buck", metadata: { kind: "cash", yieldType: "fixed_pct_year", yieldRatePct: 8 } });
    expect(resolveLiquidBucketRate([bucket], null)).toBe(0);
    expect(resolveLiquidBucketRate([bucket], "missing")).toBe(0);
  });
});

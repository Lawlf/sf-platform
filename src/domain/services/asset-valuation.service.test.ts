import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { AssetValuationService } from "./asset-valuation.service";

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "a1",
    userId: "u1",
    category: "other",
    label: "Ativo de teste",
    currentValue: Money.fromCents(100_000_00n), // R$ 100.000,00
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

describe("AssetValuationService.computeCurrentValue", () => {
  it("retorna o valor original quando não há purchaseDate", () => {
    const asset = makeAsset();
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2026-05-20"));
    expect(result.toCents()).toBe(100_000_00n);
  });

  it("retorna o valor original quando a taxa é 0", () => {
    const asset = makeAsset({
      purchaseDate: new Date("2025-01-01"),
      depreciationRatePctYear: 0,
    });
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2026-01-01"));
    expect(result.toCents()).toBe(100_000_00n);
  });

  it("deprecia linearmente: 20%/ano em 1 ano = -20%", () => {
    const asset = makeAsset({
      purchaseDate: new Date("2025-05-20"),
      depreciationRatePctYear: 20,
      depreciationKind: "depreciating",
    });
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2026-05-20"));
    // 100k * (1 - 0.2) = 80k. Tolerância por arredondamento em 0.0001.
    expect(Number(result.toCents())).toBeCloseTo(80_000_00, -2);
  });

  it("deprecia linearmente: 30%/ano em ~6 meses (181 dias) = ~-14.88%", () => {
    const asset = makeAsset({
      purchaseDate: new Date("2025-11-20"),
      depreciationRatePctYear: 30,
      depreciationKind: "depreciating",
    });
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2026-05-20"));
    // 181 / 365 = 0.4959 anos. ratio = 1 - 0.30 * 0.4959 = 0.85123.
    // 100_000_00 * 0.85123 = ~85_12000 cents.
    expect(Number(result.toCents())).toBeCloseTo(85_12000, -4);
  });

  it("clampa em zero (não negativo) quando totalmente depreciado", () => {
    const asset = makeAsset({
      purchaseDate: new Date("2020-05-20"),
      depreciationRatePctYear: 50, // 50% ao ano * 6 anos = 300%
      depreciationKind: "depreciating",
    });
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2026-05-20"));
    expect(result.toCents()).toBe(0n);
  });

  it("aprecia com taxa negativa", () => {
    const asset = makeAsset({
      purchaseDate: new Date("2025-05-20"),
      depreciationRatePctYear: -5, // aprecia 5% ao ano
      depreciationKind: "appreciating",
    });
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2026-05-20"));
    // 100k * (1 - (-5/100) * 1) = 100k * 1.05 = 105k.
    expect(Number(result.toCents())).toBeCloseTo(105_000_00, -2);
  });

  it("retorna o valor original quando asOf é anterior à purchaseDate", () => {
    const asset = makeAsset({
      purchaseDate: new Date("2026-05-20"),
      depreciationRatePctYear: 20,
      depreciationKind: "depreciating",
    });
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2025-01-01"));
    expect(result.toCents()).toBe(100_000_00n);
  });

  it("consumível com 100%/ano zera em 1 ano", () => {
    const asset = makeAsset({
      purchaseDate: new Date("2025-05-20"),
      depreciationRatePctYear: 100,
      depreciationKind: "consumable",
    });
    const result = AssetValuationService.computeCurrentValue(asset, new Date("2026-05-20"));
    expect(result.toCents()).toBe(0n);
  });
});

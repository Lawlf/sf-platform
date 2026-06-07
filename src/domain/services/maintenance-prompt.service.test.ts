import { describe, expect, it } from "vitest";

import type { AssetEntity, AssetMetadata } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { MaintenancePromptService } from "./maintenance-prompt.service";

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "a1",
    userId: "u1",
    category: "cash",
    label: "Nubank",
    currentValue: Money.fromCents(10_000_00n),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
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

function cashMeta(opts: {
  yieldType: "none" | "cdi" | "fixed_pct_year";
  yieldRatePct?: number;
  lastReviewedAt?: Date;
  institution?: string;
}): AssetMetadata {
  const meta: AssetMetadata = {
    kind: "cash",
    yieldType: opts.yieldType,
  };
  if (opts.yieldRatePct !== undefined) meta.yieldRatePct = opts.yieldRatePct;
  if (opts.lastReviewedAt !== undefined) meta.lastReviewedAt = opts.lastReviewedAt;
  if (opts.institution !== undefined) meta.institution = opts.institution;
  return meta;
}

describe("MaintenancePromptService.computeNeedsReview", () => {
  it("retorna lista vazia quando nao ha cash assets", () => {
    const assets: AssetEntity[] = [
      makeAsset({
        id: "v1",
        category: "vehicle",
        metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2020 },
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(
      assets,
      new Date("2026-05-20T00:00:00Z"),
    );
    expect(result).toEqual([]);
  });

  it("filtra cash com yieldType=none", () => {
    const assets = [
      makeAsset({
        id: "c1",
        metadata: cashMeta({ yieldType: "none" }),
        createdAt: new Date("2020-01-01T00:00:00Z"),
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(
      assets,
      new Date("2026-05-20T00:00:00Z"),
    );
    expect(result).toEqual([]);
  });

  it("filtra cash com yieldType=cdi e revisao recente (< 30 dias)", () => {
    const asOf = new Date("2026-05-20T00:00:00Z");
    const tenDaysAgo = new Date(asOf.getTime() - 10 * 86_400_000);
    const assets = [
      makeAsset({
        id: "c1",
        metadata: cashMeta({
          yieldType: "cdi",
          yieldRatePct: 110,
          lastReviewedAt: tenDaysAgo,
          institution: "Nubank",
        }),
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(assets, asOf);
    expect(result).toEqual([]);
  });

  it("inclui cash com yieldType=cdi e revisao antiga (>= 30 dias)", () => {
    const asOf = new Date("2026-05-20T00:00:00Z");
    const fortyDaysAgo = new Date(asOf.getTime() - 40 * 86_400_000);
    const assets = [
      makeAsset({
        id: "c1",
        label: "Reserva Nubank",
        metadata: cashMeta({
          yieldType: "cdi",
          yieldRatePct: 110,
          lastReviewedAt: fortyDaysAgo,
          institution: "Nubank",
        }),
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(assets, asOf);
    expect(result).toHaveLength(1);
    const item = result[0];
    if (!item) throw new Error("expected one item");
    expect(item.assetId).toBe("c1");
    expect(item.label).toBe("Reserva Nubank");
    expect(item.institution).toBe("Nubank");
    expect(item.yieldDescription).toBe("110% do CDI");
    expect(item.daysSinceReview).toBe(40);
    expect(item.lastReviewedAt).toEqual(fortyDaysAgo);
  });

  it("usa createdAt como baseline quando lastReviewedAt e nulo", () => {
    const asOf = new Date("2026-05-20T00:00:00Z");
    const createdAt = new Date(asOf.getTime() - 60 * 86_400_000);
    const assets = [
      makeAsset({
        id: "c1",
        createdAt,
        metadata: cashMeta({ yieldType: "cdi", yieldRatePct: 100 }),
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(assets, asOf);
    expect(result).toHaveLength(1);
    const item = result[0];
    if (!item) throw new Error("expected one item");
    expect(item.lastReviewedAt).toBeNull();
    expect(item.daysSinceReview).toBe(60);
  });

  it("formata yieldDescription para fixed_pct_year", () => {
    const asOf = new Date("2026-05-20T00:00:00Z");
    const createdAt = new Date(asOf.getTime() - 90 * 86_400_000);
    const assets = [
      makeAsset({
        id: "c1",
        createdAt,
        metadata: cashMeta({
          yieldType: "fixed_pct_year",
          yieldRatePct: 12.5,
          institution: "Itau",
        }),
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(assets, asOf);
    expect(result).toHaveLength(1);
    const item = result[0];
    if (!item) throw new Error("expected one item");
    expect(item.yieldDescription).toBe("12,5% ao ano");
  });

  it("ordena por daysSinceReview decrescente", () => {
    const asOf = new Date("2026-05-20T00:00:00Z");
    const assets = [
      makeAsset({
        id: "c1",
        label: "Recente",
        metadata: cashMeta({
          yieldType: "cdi",
          yieldRatePct: 100,
          lastReviewedAt: new Date(asOf.getTime() - 35 * 86_400_000),
        }),
      }),
      makeAsset({
        id: "c2",
        label: "Antigo",
        metadata: cashMeta({
          yieldType: "cdi",
          yieldRatePct: 100,
          lastReviewedAt: new Date(asOf.getTime() - 90 * 86_400_000),
        }),
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(assets, asOf);
    expect(result.map((i) => i.assetId)).toEqual(["c2", "c1"]);
  });

  it("ignora assets sem metadata", () => {
    const asOf = new Date("2026-05-20T00:00:00Z");
    const assets = [
      makeAsset({
        id: "c1",
        category: "cash",
        metadata: null,
        createdAt: new Date(asOf.getTime() - 90 * 86_400_000),
      }),
    ];
    const result = MaintenancePromptService.computeNeedsReview(assets, asOf);
    expect(result).toEqual([]);
  });
});

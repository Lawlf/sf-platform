import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetMetadataMismatch,
  AssetNotFound,
  InvalidAssetLabel,
  InvalidAssetValue,
} from "@/domain/errors/asset-errors";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { updateAsset } from "./update-asset.use-case";

function makeAssetRepo(): AssetRepositoryPort {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByProfile: vi.fn(),
    createDefaultWallet: vi.fn(),
    findActiveByProfileAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForProfile: vi.fn(async () => []),
    listCryptoTickersForProfile: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };
}

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
    profileId: "profile-1",
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
    monthlyCostEstimateCents: null,
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

describe("updateAsset", () => {
  it("applies partial updates and bumps updatedAt", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock(new Date("2026-06-01T00:00:00Z"));
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await updateAsset(
      { assets, clock },
      {
        profileId: "profile-1",
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

  it("seta a estimativa mensal de custo", async () => {
    const assets = makeAssetRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({ monthlyCostEstimateCents: null }),
    );
    const result = await updateAsset(
      { assets, clock: makeClock() },
      { profileId: "profile-1", assetId: "asset-1", monthlyCostEstimateCents: 90000n },
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.monthlyCostEstimateCents).toBe(90000n);
  });

  it("limpa a estimativa mensal com null", async () => {
    const assets = makeAssetRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({ monthlyCostEstimateCents: 90000n }),
    );
    const result = await updateAsset(
      { assets, clock: makeClock() },
      { profileId: "profile-1", assetId: "asset-1", monthlyCostEstimateCents: null },
    );
    if (isOk(result)) expect(result.value.monthlyCostEstimateCents).toBeNull();
  });

  it("estimativa omitida preserva a existente", async () => {
    const assets = makeAssetRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({ monthlyCostEstimateCents: 50000n }),
    );
    const result = await updateAsset(
      { assets, clock: makeClock() },
      { profileId: "profile-1", assetId: "asset-1", label: "Novo nome" },
    );
    if (isOk(result)) expect(result.value.monthlyCostEstimateCents).toBe(50000n);
  });

  it("rejeita estimativa mensal negativa", async () => {
    const assets = makeAssetRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    const result = await updateAsset(
      { assets, clock: makeClock() },
      { profileId: "profile-1", assetId: "asset-1", monthlyCostEstimateCents: -1n },
    );
    expect(isErr(result)).toBe(true);
  });

  it("atualiza tipo, taxa e data de aquisição do comportamento do valor", async () => {
    const assets = makeAssetRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({ depreciationKind: "stable", depreciationRatePctYear: 0 }),
    );
    const result = await updateAsset(
      { assets, clock: makeClock() },
      {
        profileId: "profile-1",
        assetId: "asset-1",
        depreciationKind: "appreciating",
        depreciationRatePctYear: -3,
        acquiredAt: new Date("2024-03-01"),
      },
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.depreciationKind).toBe("appreciating");
      expect(result.value.depreciationRatePctYear).toBe(-3);
      expect(result.value.acquiredAt).toEqual(new Date("2024-03-01"));
    }
  });

  it("comportamento do valor omitido preserva o existente", async () => {
    const assets = makeAssetRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({ depreciationKind: "depreciating", depreciationRatePctYear: 15 }),
    );
    const result = await updateAsset(
      { assets, clock: makeClock() },
      { profileId: "profile-1", assetId: "asset-1", label: "Novo nome" },
    );
    if (isOk(result)) {
      expect(result.value.depreciationKind).toBe("depreciating");
      expect(result.value.depreciationRatePctYear).toBe(15);
    }
  });

  it("rejeita taxa anual fora do intervalo -50 a 100", async () => {
    const assets = makeAssetRepo();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    const result = await updateAsset(
      { assets, clock: makeClock() },
      { profileId: "profile-1", assetId: "asset-1", depreciationRatePctYear: 150 },
    );
    expect(isErr(result)).toBe(true);
  });

  it("returns AssetNotFound when repository returns null (scoped by userId)", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await updateAsset(
      { assets, clock },
      { profileId: "profile-1", assetId: "missing", label: "x" },
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
      { profileId: "profile-1", assetId: "asset-1", label: "novo" },
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
      { profileId: "profile-1", assetId: "asset-1", label: "   " },
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
      { profileId: "profile-1", assetId: "asset-1", currentValueCents: -100n },
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
        profileId: "profile-1",
        assetId: "asset-1",
        metadata: { kind: "real_estate", addressCity: "Rio" },
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetMetadataMismatch);
    }
  });

  it("keeps the asset currency when updating value of a non-BRL asset", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({ currentValue: Money.fromCents(8_000_000n, "USD") }),
    );

    const result = await updateAsset(
      { assets, clock },
      { profileId: "profile-1", assetId: "asset-1", currentValueCents: 7_500_000n },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.currentValue.currency).toBe("USD");
      expect(result.value.currentValue.toCents()).toBe(7_500_000n);
    }
  });

  it("allows clearing metadata to null", async () => {
    const assets = makeAssetRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());

    const result = await updateAsset(
      { assets, clock },
      { profileId: "profile-1", assetId: "asset-1", metadata: null },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toBeNull();
    }
  });
});

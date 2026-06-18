import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { FinancialPlanningSettingsRepositoryPort } from "@/domain/ports/repositories/financial-planning-settings.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { setLiquidBucket } from "./set-liquid-bucket.use-case";

function makeAsset(p: Partial<AssetEntity> & Pick<AssetEntity, "id" | "userId" | "profileId" | "category">): AssetEntity {
  return {
    label: "x",
    currentValue: Money.fromCents(100000n),
    metadata: { kind: "cash" },
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
    ...p,
  };
}

function makeAssetsRepo(initial: AssetEntity[]): AssetRepositoryPort {
  return {
    findById: async (id: string, profileId: string) => {
      const found = initial.find((a) => a.id === id && a.profileId === profileId);
      return found ?? null;
    },
    create: async () => { throw new Error("not used"); },
    update: async () => { throw new Error("not used"); },
    findActiveByProfile: async () => { throw new Error("not used"); },
    findActiveByProfileAndCategory: async () => { throw new Error("not used"); },
    findByIdWithAllocations: async () => { throw new Error("not used"); },
    findActiveWithAllocations: async () => { throw new Error("not used"); },
    listStockTickersForProfile: async () => { throw new Error("not used"); },
    listCryptoTickersForProfile: async () => { throw new Error("not used"); },
    softDelete: async () => { throw new Error("not used"); },
  } as unknown as AssetRepositoryPort;
}

function makeSettingsRepo(): FinancialPlanningSettingsRepositoryPort {
  const store = new Map<string, FinancialPlanningSettingsEntity>();
  return {
    findByProfile: async (profileId: string) => store.get(profileId) ?? null,
    upsertLiquidBucket: async (profileId: string, liquidBucketAssetId: string | null) => {
      const existing = store.get(profileId);
      const record: FinancialPlanningSettingsEntity = {
        userId: profileId,
        profileId,
        liquidBucketAssetId,
        createdAt: existing?.createdAt ?? new Date(0),
        updatedAt: new Date(),
      };
      store.set(profileId, record);
      return record;
    },
  };
}

const cashAsset = makeAsset({ id: "buck", userId: "u1", profileId: "profile-1", category: "cash" });
const vehicleAsset = makeAsset({
  id: "car",
  userId: "u1",
  profileId: "profile-1",
  category: "vehicle",
  metadata: { kind: "vehicle", brand: "Toyota", model: "Corolla", year: 2020 },
});

const assets = makeAssetsRepo([cashAsset, vehicleAsset]);
const settings = makeSettingsRepo();

describe("setLiquidBucket", () => {
  it("sets the bucket to a cash asset owned by the user", async () => {
    const res = await setLiquidBucket({ assets, settings }, { userId: "u1", profileId: "profile-1", assetId: "buck" });
    expect(res.ok).toBe(true);
    const stored = await settings.findByProfile("profile-1");
    expect(stored?.liquidBucketAssetId).toBe("buck");
  });

  it("clears the bucket when assetId is null", async () => {
    const res = await setLiquidBucket({ assets, settings }, { userId: "u1", profileId: "profile-1", assetId: null });
    expect(res.ok).toBe(true);
    const stored = await settings.findByProfile("profile-1");
    expect(stored?.liquidBucketAssetId).toBeNull();
  });

  it("rejects an asset that does not belong to the user", async () => {
    const res = await setLiquidBucket({ assets, settings }, { userId: "intruder", profileId: "profile-intruder", assetId: "buck" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe("Ativo não encontrado.");
  });

  it("rejects a non-cash asset", async () => {
    const res = await setLiquidBucket({ assets, settings }, { userId: "u1", profileId: "profile-1", assetId: "car" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/reserva/);
  });
});

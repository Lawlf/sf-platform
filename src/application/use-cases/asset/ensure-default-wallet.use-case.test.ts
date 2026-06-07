import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { ensureDefaultWallet, type EnsureDefaultWalletDeps } from "./ensure-default-wallet.use-case";

function cashAsset(): AssetEntity {
  return {
    id: "acc1",
    userId: "u1",
    category: "cash",
    label: "Nubank",
    currentValue: Money.fromCents(5000n),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
  } as AssetEntity;
}

function makeDeps(existing: AssetEntity[]): EnsureDefaultWalletDeps {
  return {
    assets: {
      findActiveByUserAndCategory: vi.fn(async () => existing),
      createDefaultWallet: vi.fn(async () => undefined),
    },
    clock: { now: () => new Date("2026-06-05T00:00:00Z") },
    newId: () => "new-id",
  } as unknown as EnsureDefaultWalletDeps;
}

describe("ensureDefaultWallet", () => {
  it("cria a Carteira quando não há ativo cash", async () => {
    const deps = makeDeps([]);
    await ensureDefaultWallet(deps, "u1");
    expect(deps.assets.createDefaultWallet).toHaveBeenCalledTimes(1);
    const created = (deps.assets.createDefaultWallet as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as AssetEntity;
    expect(created.label).toBe("Carteira");
    expect(created.category).toBe("cash");
    expect(created.currentValue.toCents()).toBe(0n);
  });

  it("não cria nada quando já existe ativo cash", async () => {
    const deps = makeDeps([cashAsset()]);
    await ensureDefaultWallet(deps, "u1");
    expect(deps.assets.createDefaultWallet).not.toHaveBeenCalled();
  });
});

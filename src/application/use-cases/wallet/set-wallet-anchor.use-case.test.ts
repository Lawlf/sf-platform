import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { setWalletAnchor, type SetWalletAnchorDeps } from "./set-wallet-anchor.use-case";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
  return r.value;
}
const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));

function wallet(over: Partial<AssetEntity>): AssetEntity {
  return {
    id: "wallet-1", userId: "u1", category: "cash", label: "Carteira",
    currentValue: moneyOf(0), metadata: null, fipeCode: null, fipeLastSyncedAt: null,
    acquiredAt: null, depreciationKind: "stable", depreciationRatePctYear: 0,
    purchaseDate: null, purchasePriceCents: null, createdAt: utc(2026, 6, 1),
    updatedAt: utc(2026, 6, 1), deactivatedAt: null, deactivationKind: null,
    salePriceCents: null, deactivationReason: null, deletedAt: null,
    anchorAt: null, externalAccountKey: null, ...over,
  } as unknown as AssetEntity;
}

describe("setWalletAnchor", () => {
  it("writes the new value and anchors at now", async () => {
    let saved: AssetEntity | null = null;
    const deps: SetWalletAnchorDeps = {
      assets: {
        findActiveByUserAndCategory: async () => [wallet({})],
        update: async (a) => { saved = a; },
        createDefaultWallet: async () => {},
      },
      clock: { now: () => utc(2026, 6, 7) },
    };
    const r = await setWalletAnchor(deps, { userId: "u1", valueCents: 50000n });
    expect(isOk(r)).toBe(true);
    expect(saved!.currentValue.toCents()).toBe(50000n);
    expect(saved!.anchorAt).toEqual(utc(2026, 6, 7));
  });

  it("creates a dedicated Carteira and anchors it when the user has none", async () => {
    let saved: AssetEntity | null = null;
    let created = false;
    const deps: SetWalletAnchorDeps = {
      assets: {
        findActiveByUserAndCategory: async () => [],
        update: async (a) => { saved = a; },
        createDefaultWallet: async () => { created = true; },
      },
      clock: { now: () => utc(2026, 6, 7) },
    };
    const r = await setWalletAnchor(deps, { userId: "u1", valueCents: 100n });
    expect(isOk(r)).toBe(true);
    expect(created).toBe(true);
    expect(saved!.label).toBe("Carteira");
    expect(saved!.currentValue.toCents()).toBe(100n);
  });
});

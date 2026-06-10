import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { refreshAllUserCrypto } from "./refresh-all-user-crypto.use-case";

const NOW = new Date("2026-06-10T12:00:00Z");

function asset(
  id: string,
  userId: string,
  ticker: string,
  coinId: string,
  shares: number,
): AssetEntity {
  return {
    id,
    userId,
    category: "investment",
    label: ticker,
    currentValue: Money.fromCents(0n),
    metadata: { kind: "investment", investmentType: "crypto", ticker, coinId, shares },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: NOW,
    updatedAt: NOW,
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

describe("refreshAllUserCrypto", () => {
  it("deduplica coinIds entre Pro e atualiza cada ativo", async () => {
    const assetsByUser: Record<string, AssetEntity[]> = {
      u1: [asset("a1", "u1", "BTC", "bitcoin", 0.2)],
      u2: [asset("a2", "u2", "BTC", "bitcoin", 1), asset("a3", "u2", "ETH", "ethereum", 3)],
    };
    const update = vi.fn(async () => {});
    const upsertMany = vi.fn(async () => {});

    const result = await refreshAllUserCrypto({
      users: { findAllPro: vi.fn(async () => [{ id: "u1" }, { id: "u2" }]) } as never,
      assets: {
        findActiveByUserAndCategory: vi.fn(async (uid: string) => assetsByUser[uid] ?? []),
        update,
      } as never,
      quotes: {
        fetchByIds: vi.fn(async (coinIds: string[]) => {
          expect(coinIds).toEqual(["bitcoin", "ethereum"]);
          return [
            { coinId: "bitcoin", priceCents: 35_000_000n, fetchedAt: NOW },
            { coinId: "ethereum", priceCents: 1_800_000n, fetchedAt: NOW },
          ];
        }),
      } as never,
      catalog: { upsertMany, findByCoinId: vi.fn() } as never,
      clock: { now: () => NOW },
    });

    expect(result).toEqual({ symbols: 2, updated: 3, failed: 0 });
    expect(upsertMany).toHaveBeenCalledWith([
      { coinId: "bitcoin", lastPriceCents: 35_000_000n, lastFetchedAt: NOW },
      { coinId: "ethereum", lastPriceCents: 1_800_000n, lastFetchedAt: NOW },
    ]);
    const a1Call = update.mock.calls.find((c) => ((c as unknown[])[0] as AssetEntity).id === "a1");
    const a1 = (a1Call as unknown[])[0] as AssetEntity;
    expect(a1.currentValue.toCents()).toBe(7_000_000n);
  });

  it("retorna zerado quando não há usuários Pro", async () => {
    const result = await refreshAllUserCrypto({
      users: { findAllPro: vi.fn(async () => []) } as never,
      assets: {} as never,
      quotes: {} as never,
      catalog: { upsertMany: vi.fn(async () => {}), findByCoinId: vi.fn() } as never,
      clock: { now: () => NOW },
    });
    expect(result).toEqual({ symbols: 0, updated: 0, failed: 0 });
  });

  it("conta failed quando a moeda não veio na resposta", async () => {
    const assetsByUser: Record<string, AssetEntity[]> = {
      u1: [asset("a1", "u1", "BTC", "bitcoin", 1)],
    };
    const update = vi.fn(async () => {});
    const result = await refreshAllUserCrypto({
      users: { findAllPro: vi.fn(async () => [{ id: "u1" }]) } as never,
      assets: {
        findActiveByUserAndCategory: vi.fn(async (uid: string) => assetsByUser[uid] ?? []),
        update,
      } as never,
      quotes: { fetchByIds: vi.fn(async () => []) } as never,
      catalog: { upsertMany: vi.fn(async () => {}), findByCoinId: vi.fn() } as never,
      clock: { now: () => NOW },
    });
    expect(result).toEqual({ symbols: 1, updated: 0, failed: 1 });
    expect(update).not.toHaveBeenCalled();
  });
});

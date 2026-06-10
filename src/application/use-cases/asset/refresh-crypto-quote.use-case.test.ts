import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { CryptoQuoteAdapter } from "@/domain/ports/external/crypto-quote-adapter.port";
import { isOk } from "@/shared/errors/result";
import { Money } from "@/domain/value-objects/money.vo";

import { refreshCryptoQuote } from "./refresh-crypto-quote.use-case";

const NOW = new Date("2026-06-10T12:00:00Z");

function cryptoAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "a1",
    userId: "u1",
    category: "investment",
    label: "Bitcoin",
    currentValue: Money.fromCents(0n),
    metadata: {
      kind: "investment",
      investmentType: "crypto",
      ticker: "BTC",
      coinId: "bitcoin",
      shares: 0.2,
    },
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
    ...overrides,
  };
}

function deps(
  asset: AssetEntity | null,
  quote: { coinId: string; priceCents: bigint; fetchedAt: Date } | null = {
    coinId: "bitcoin",
    priceCents: 35_000_000n,
    fetchedAt: NOW,
  },
) {
  const update = vi.fn(async () => {});
  const quotes: CryptoQuoteAdapter = {
    fetchByIds: vi.fn(async () => (quote ? [quote] : [])),
    fetchQuotes: vi.fn(async () => []),
  };
  return {
    update,
    deps: {
      assets: {
        findById: vi.fn(async () => asset),
        update,
      } as never,
      quotes,
      clock: { now: () => NOW },
    },
  };
}

describe("refreshCryptoQuote", () => {
  it("recomputa currentValue com quantidade fracionária e grava metadata", async () => {
    const asset = cryptoAsset();
    const { deps: d, update } = deps(asset);

    const res = await refreshCryptoQuote(d, { userId: "u1", assetId: "a1" });

    expect(isOk(res)).toBe(true);
    const updated = (update.mock.calls[0] as unknown[])[0] as AssetEntity;
    expect(updated.currentValue.toCents()).toBe(7_000_000n);
    expect(updated.metadata).toMatchObject({ lastQuoteCents: 35_000_000n, lastQuoteAt: NOW });
  });

  it("erro quando o ativo não é cripto", async () => {
    const asset = cryptoAsset({ metadata: { kind: "investment", investmentType: "stocks", ticker: "PETR4", shares: 100 } });
    const { deps: d } = deps(asset);
    const res = await refreshCryptoQuote(d, { userId: "u1", assetId: "a1" });
    expect(isOk(res)).toBe(false);
  });

  it("erro quando a cotação está indisponível", async () => {
    const asset = cryptoAsset();
    const { deps: d } = deps(asset, null as never);
    const res = await refreshCryptoQuote(d, { userId: "u1", assetId: "a1" });
    expect(isOk(res)).toBe(false);
  });
});

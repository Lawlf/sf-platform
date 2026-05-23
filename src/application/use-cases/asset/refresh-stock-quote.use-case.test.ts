import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetNotFound,
  AssetNotStock,
  QuoteUnavailable,
} from "@/domain/errors/asset-errors";
import type { QuoteAdapter, StockQuoteResult } from "@/domain/ports/external/quote-adapter.port";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type {
  StockCatalogEntity,
  StockCatalogRepository,
  StockCatalogUpsertEntry,
} from "@/domain/ports/repositories/stock-catalog.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { refreshStockQuote } from "./refresh-stock-quote.use-case";

function makeStockAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
    category: "investment",
    label: "PETR4 - 100 cotas",
    currentValue: Money.fromCents(380_000n), // 100 * R$38
    metadata: {
      kind: "investment",
      investmentType: "stocks",
      ticker: "PETR4",
      shares: 100,
      avgPriceCents: 3800n,
    },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    ...overrides,
  };
}

function makeRepoBackedByMap() {
  const store = new Map<string, AssetEntity>();
  const repo: AssetRepository = {
    create: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    update: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    findById: vi.fn(async (id: string, userId: string) => {
      const a = store.get(id);
      return a && a.userId === userId ? a : null;
    }),
    findActiveByUser: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
  };
  return { repo, store };
}

function makeQuoteAdapter(result: StockQuoteResult | null): QuoteAdapter {
  return {
    fetchQuote: vi.fn(async () => result),
    fetchQuotes: vi.fn(async () => (result ? [result] : [])),
    listAvailableStocks: vi.fn(async () => []),
  };
}

function makeCatalog(initial: StockCatalogEntity | null = null) {
  let row: StockCatalogEntity | null = initial;
  const upsert = vi.fn(async (entry: StockCatalogUpsertEntry) => {
    row = {
      ticker: entry.ticker,
      companyName: entry.companyName,
      lastPriceCents: entry.lastPriceCents,
      lastFetchedAt: entry.lastFetchedAt,
      createdAt: row?.createdAt ?? entry.lastFetchedAt,
      updatedAt: entry.lastFetchedAt,
    };
  });
  const repo: StockCatalogRepository = {
    upsert,
    upsertMany: vi.fn(async () => undefined),
    findByTicker: vi.fn(async () => row),
    search: vi.fn(async () => []),
    listAll: vi.fn(async () => []),
    listStaleTickers: vi.fn(async () => []),
  };
  return { repo, upsert };
}

function makeClock(now = new Date("2026-05-20T12:00:00Z")) {
  return { now: vi.fn(() => now) };
}

describe("refreshStockQuote", () => {
  it("updates lastQuote, currentValue and updatedAt on success (no cache)", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeStockAsset());
    const fetchedAt = new Date("2026-05-20T12:00:00Z");
    const quotes = makeQuoteAdapter({
      symbol: "PETR4",
      priceCents: 4200n,
      currency: "BRL",
      fetchedAt,
      companyName: "Petrobras",
    });
    const { repo: catalog, upsert } = makeCatalog(null);
    const clock = makeClock(new Date("2026-05-20T12:01:00Z"));

    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.symbol).toBe("PETR4");
      expect(r.value.priceCents).toBe(4200n);
      // 4200 * 100 shares
      expect(r.value.asset.currentValue.toCents()).toBe(420_000n);
      const meta = r.value.asset.metadata;
      expect(meta?.kind).toBe("investment");
      if (meta?.kind === "investment") {
        expect(meta.lastQuoteCents).toBe(4200n);
        expect(meta.lastQuoteAt).toEqual(fetchedAt);
        // preserves the original ticker/shares/avgPrice
        expect(meta.ticker).toBe("PETR4");
        expect(meta.shares).toBe(100);
        expect(meta.avgPriceCents).toBe(3800n);
      }
    }
    expect(quotes.fetchQuote).toHaveBeenCalledWith("PETR4");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("reuses fresh catalog entry without calling the adapter", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeStockAsset());
    const now = new Date("2026-05-20T12:00:00Z");
    const fetchedAt = new Date("2026-05-20T11:30:00Z"); // 30min ago, within 1h window
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog, upsert } = makeCatalog({
      ticker: "PETR4",
      companyName: "Petrobras",
      lastPriceCents: 5000n,
      lastFetchedAt: fetchedAt,
      createdAt: fetchedAt,
      updatedAt: fetchedAt,
    });
    const clock = makeClock(now);

    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.priceCents).toBe(5000n);
      // 5000 * 100 shares
      expect(r.value.asset.currentValue.toCents()).toBe(500_000n);
    }
    expect(quotes.fetchQuote).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("ignores stale catalog entry and calls the adapter", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeStockAsset());
    const now = new Date("2026-05-20T12:00:00Z");
    const staleAt = new Date("2026-05-20T08:00:00Z"); // 4h ago, beyond 1h window
    const fetchedAt = new Date("2026-05-20T12:00:00Z");
    const quotes = makeQuoteAdapter({
      symbol: "PETR4",
      priceCents: 4500n,
      currency: "BRL",
      fetchedAt,
    });
    const { repo: catalog, upsert } = makeCatalog({
      ticker: "PETR4",
      companyName: "Petrobras",
      lastPriceCents: 5000n,
      lastFetchedAt: staleAt,
      createdAt: staleAt,
      updatedAt: staleAt,
    });
    const clock = makeClock(now);

    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock },
      { userId: "user-1", assetId: "asset-1" },
    );

    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.priceCents).toBe(4500n);
    expect(quotes.fetchQuote).toHaveBeenCalledWith("PETR4");
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("returns AssetNotFound when missing", async () => {
    const { repo } = makeRepoBackedByMap();
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "user-1", assetId: "missing" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(AssetNotFound);
    expect(quotes.fetchQuote).not.toHaveBeenCalled();
  });

  it("returns AssetNotFound when asset belongs to another user", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeStockAsset({ userId: "owner" }));
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "intruder", assetId: "asset-1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(AssetNotFound);
  });

  it("returns AssetDeactivated when asset is inactive", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeStockAsset({ deactivatedAt: new Date("2026-01-01"), deactivationReason: "vendido" }),
    );
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "user-1", assetId: "asset-1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(AssetDeactivated);
    expect(quotes.fetchQuote).not.toHaveBeenCalled();
  });

  it("returns AssetNotStock when category is not investment", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeStockAsset({
        category: "vehicle",
        metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2003 },
      }),
    );
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "user-1", assetId: "asset-1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(AssetNotStock);
    expect(quotes.fetchQuote).not.toHaveBeenCalled();
  });

  it("returns AssetNotStock when investmentType is not stocks", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeStockAsset({
        metadata: {
          kind: "investment",
          investmentType: "fixed_income",
          institution: "XP",
        },
      }),
    );
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "user-1", assetId: "asset-1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(AssetNotStock);
    expect(quotes.fetchQuote).not.toHaveBeenCalled();
  });

  it("returns AssetNotStock when ticker is missing", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeStockAsset({
        metadata: {
          kind: "investment",
          investmentType: "stocks",
          shares: 10,
          avgPriceCents: 1000n,
        },
      }),
    );
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "user-1", assetId: "asset-1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(AssetNotStock);
  });

  it("returns QuoteUnavailable when adapter returns null and catalog has no fresh entry", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set("asset-1", makeStockAsset());
    const quotes = makeQuoteAdapter(null);
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "user-1", assetId: "asset-1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(QuoteUnavailable);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("computes currentValue as 0 when shares is undefined", async () => {
    const { repo, store } = makeRepoBackedByMap();
    store.set(
      "asset-1",
      makeStockAsset({
        metadata: {
          kind: "investment",
          investmentType: "stocks",
          ticker: "PETR4",
        },
      }),
    );
    const quotes = makeQuoteAdapter({
      symbol: "PETR4",
      priceCents: 5000n,
      currency: "BRL",
      fetchedAt: new Date(),
    });
    const { repo: catalog } = makeCatalog(null);
    const r = await refreshStockQuote(
      { assets: repo, catalog, quotes, clock: makeClock() },
      { userId: "user-1", assetId: "asset-1" },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.asset.currentValue.toCents()).toBe(0n);
    }
  });
});

import { describe, expect, it, vi } from "vitest";

import type {
  ListAvailableStocksOptions,
  QuoteAdapter,
  StockListEntry,
} from "@/domain/ports/external/quote-adapter.port";
import type {
  StockCatalogRepository,
  StockCatalogUpsertEntry,
} from "@/domain/ports/repositories/stock-catalog.repository";

import { seedStockCatalog } from "./seed-stock-catalog.use-case";

function makeCatalogSpy() {
  const upsertMany = vi.fn(async (_entries: StockCatalogUpsertEntry[]) => undefined);
  const repo: StockCatalogRepository = {
    upsert: vi.fn(async () => undefined),
    upsertMany,
    findByTicker: vi.fn(async () => null),
    search: vi.fn(async () => []),
    listAll: vi.fn(async () => []),
    listStaleTickers: vi.fn(async () => []),
  };
  return { repo, upsertMany };
}

function makeQuotesSpy(pages: StockListEntry[][]) {
  let call = 0;
  const listAvailableStocks = vi.fn<
    (opts?: ListAvailableStocksOptions) => Promise<StockListEntry[]>
  >(async () => {
    const r = pages[call] ?? [];
    call += 1;
    return r;
  });
  const quotes: QuoteAdapter = {
    fetchQuote: vi.fn(async () => null),
    fetchQuotes: vi.fn(async () => []),
    listAvailableStocks,
  };
  return { quotes, listAvailableStocks };
}

function makeClock(now = new Date("2026-05-20T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function entry(ticker: string, name: string, priceCents: bigint | null): StockListEntry {
  return { ticker, name, priceCents };
}

describe("seedStockCatalog", () => {
  it("stops at the first empty page and returns zero counts", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes, listAvailableStocks } = makeQuotesSpy([[]]);
    const r = await seedStockCatalog({ catalog: repo, quotes, clock: makeClock() }, {});
    expect(r).toEqual({ inserted: 0, pages: 0 });
    expect(listAvailableStocks).toHaveBeenCalledTimes(1);
    expect(upsertMany).not.toHaveBeenCalled();
  });

  it("uses default maxPages=5 and pageSize=100 with sortBy=volume desc", async () => {
    const { repo } = makeCatalogSpy();
    const { quotes, listAvailableStocks } = makeQuotesSpy([[]]);
    await seedStockCatalog({ catalog: repo, quotes, clock: makeClock() }, {});
    expect(listAvailableStocks).toHaveBeenCalledWith({
      limit: 100,
      page: 1,
      sortBy: "volume",
      sortOrder: "desc",
    });
  });

  it("upserts one batch when the first page has stocks then stops on empty", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const fixed = new Date("2026-05-20T12:34:56Z");
    const { quotes, listAvailableStocks } = makeQuotesSpy([
      [entry("PETR4", "Petrobras", 3000n), entry("VALE3", "Vale", 6000n)],
      [],
    ]);
    const r = await seedStockCatalog(
      { catalog: repo, quotes, clock: makeClock(fixed) },
      { maxPages: 3, pageSize: 50 },
    );
    expect(r).toEqual({ inserted: 2, pages: 1 });
    expect(listAvailableStocks).toHaveBeenCalledTimes(2);
    expect(upsertMany).toHaveBeenCalledTimes(1);
    expect(upsertMany).toHaveBeenCalledWith([
      {
        ticker: "PETR4",
        companyName: "Petrobras",
        lastPriceCents: 3000n,
        lastFetchedAt: fixed,
      },
      {
        ticker: "VALE3",
        companyName: "Vale",
        lastPriceCents: 6000n,
        lastFetchedAt: fixed,
      },
    ]);
  });

  it("filters out entries with null priceCents", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes } = makeQuotesSpy([
      [entry("PETR4", "Petrobras", 3000n), entry("AAAA3", "AAAA", null)],
      [],
    ]);
    const r = await seedStockCatalog({ catalog: repo, quotes, clock: makeClock() }, {});
    expect(r.inserted).toBe(1);
    expect(upsertMany).toHaveBeenCalledTimes(1);
    expect(upsertMany).toHaveBeenCalledWith([
      expect.objectContaining({ ticker: "PETR4", lastPriceCents: 3000n }),
    ]);
  });

  it("does not upsert when all entries on a page lack priceCents but continues paginating", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes, listAvailableStocks } = makeQuotesSpy([
      [entry("AAAA3", "AAAA", null), entry("BBBB4", "BBBB", null)],
      [entry("PETR4", "Petrobras", 3000n)],
      [],
    ]);
    const r = await seedStockCatalog(
      { catalog: repo, quotes, clock: makeClock() },
      { maxPages: 5 },
    );
    expect(r).toEqual({ inserted: 1, pages: 2 });
    expect(listAvailableStocks).toHaveBeenCalledTimes(3);
    expect(upsertMany).toHaveBeenCalledTimes(1);
  });

  it("uppercases tickers before upserting", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes } = makeQuotesSpy([[entry("petr4", "Petrobras", 3000n)], []]);
    await seedStockCatalog({ catalog: repo, quotes, clock: makeClock() }, {});
    expect(upsertMany).toHaveBeenCalledWith([expect.objectContaining({ ticker: "PETR4" })]);
  });

  it("respects maxPages and stops even when pages keep returning data", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes, listAvailableStocks } = makeQuotesSpy([
      [entry("AA1", "AA1", 100n)],
      [entry("BB1", "BB1", 200n)],
      [entry("CC1", "CC1", 300n)],
      [entry("DD1", "DD1", 400n)],
    ]);
    const r = await seedStockCatalog(
      { catalog: repo, quotes, clock: makeClock() },
      { maxPages: 2 },
    );
    expect(r).toEqual({ inserted: 2, pages: 2 });
    expect(listAvailableStocks).toHaveBeenCalledTimes(2);
    expect(upsertMany).toHaveBeenCalledTimes(2);
  });

  it("passes pageSize through to the adapter", async () => {
    const { repo } = makeCatalogSpy();
    const { quotes, listAvailableStocks } = makeQuotesSpy([[]]);
    await seedStockCatalog({ catalog: repo, quotes, clock: makeClock() }, { pageSize: 25 });
    expect(listAvailableStocks).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25, page: 1 }),
    );
  });
});

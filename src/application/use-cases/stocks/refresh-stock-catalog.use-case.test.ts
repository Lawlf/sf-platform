import { describe, expect, it, vi } from "vitest";

import type { QuoteAdapter, StockQuoteResult } from "@/domain/ports/external/quote-adapter.port";
import type {
  StockCatalogRepositoryPort,
  StockCatalogUpsertEntry,
} from "@/domain/ports/repositories/stock-catalog.repository";

import { refreshStockCatalog } from "./refresh-stock-catalog.use-case";

function makeCatalogSpy() {
  const upsertMany = vi.fn(async (_entries: StockCatalogUpsertEntry[]) => undefined);
  const repo: StockCatalogRepositoryPort = {
    upsert: vi.fn(async () => undefined),
    upsertMany,
    findByTicker: vi.fn(async () => null),
    search: vi.fn(async () => []),
    listAll: vi.fn(async () => []),
    listStaleTickers: vi.fn(async () => []),
  };
  return { repo, upsertMany };
}

function makeQuotesSpy(responses: StockQuoteResult[][]) {
  let call = 0;
  const fetchQuotes = vi.fn<(tickers: string[]) => Promise<StockQuoteResult[]>>(async () => {
    const batch = responses[call] ?? [];
    call += 1;
    return batch;
  });
  const quotes: QuoteAdapter = {
    fetchQuote: vi.fn(async () => null),
    fetchQuotes,
    listAvailableStocks: vi.fn(async () => []),
  };
  return { quotes, fetchQuotes };
}

function makeClock(now = new Date("2026-05-20T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function quote(symbol: string, priceCents: bigint, companyName?: string | null): StockQuoteResult {
  return {
    symbol,
    priceCents,
    currency: "BRL",
    fetchedAt: new Date("2026-05-20T10:00:00Z"),
    companyName: companyName ?? null,
  };
}

describe("refreshStockCatalog", () => {
  it("returns updated=0/failed=0 when input is empty", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes, fetchQuotes } = makeQuotesSpy([]);
    const r = await refreshStockCatalog(
      { catalog: repo, quotes, clock: makeClock() },
      { tickers: [] },
    );
    expect(r).toEqual({ updated: 0, failed: 0 });
    expect(fetchQuotes).not.toHaveBeenCalled();
    expect(upsertMany).not.toHaveBeenCalled();
  });

  it("normalizes, de-duplicates and uppercases tickers before batching", async () => {
    const { repo } = makeCatalogSpy();
    const { quotes, fetchQuotes } = makeQuotesSpy([[quote("PETR4", 4000n), quote("VALE3", 6000n)]]);
    const r = await refreshStockCatalog(
      { catalog: repo, quotes, clock: makeClock() },
      { tickers: ["petr4", "PETR4", " vale3 ", "", "  "] },
    );
    expect(r).toEqual({ updated: 2, failed: 0 });
    expect(fetchQuotes).toHaveBeenCalledTimes(1);
    expect(fetchQuotes).toHaveBeenCalledWith(["PETR4", "VALE3"]);
  });

  it("upserts a single batch and uses the injected clock for lastFetchedAt", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes } = makeQuotesSpy([[quote("PETR4", 3842n, "Petrobras")]]);
    const fixed = new Date("2026-05-20T12:34:56Z");
    const clock = makeClock(fixed);
    const r = await refreshStockCatalog({ catalog: repo, quotes, clock }, { tickers: ["PETR4"] });
    expect(r).toEqual({ updated: 1, failed: 0 });
    expect(upsertMany).toHaveBeenCalledTimes(1);
    expect(upsertMany).toHaveBeenCalledWith([
      {
        ticker: "PETR4",
        companyName: "Petrobras",
        lastPriceCents: 3842n,
        lastFetchedAt: fixed,
      },
    ]);
  });

  it("splits more than 10 tickers into multiple batches of 10", async () => {
    const tickers = Array.from({ length: 23 }, (_, i) => `T${String(i).padStart(2, "0")}`);
    const { repo } = makeCatalogSpy();
    const { quotes, fetchQuotes } = makeQuotesSpy([
      tickers.slice(0, 10).map((t) => quote(t, 100n)),
      tickers.slice(10, 20).map((t) => quote(t, 200n)),
      tickers.slice(20, 23).map((t) => quote(t, 300n)),
    ]);
    const r = await refreshStockCatalog({ catalog: repo, quotes, clock: makeClock() }, { tickers });
    expect(r).toEqual({ updated: 23, failed: 0 });
    expect(fetchQuotes).toHaveBeenCalledTimes(3);
    expect(fetchQuotes.mock.calls[0]?.[0]).toHaveLength(10);
    expect(fetchQuotes.mock.calls[2]?.[0]).toHaveLength(3);
  });

  it("counts batches that return [] entirely as failed", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes } = makeQuotesSpy([[]]);
    const r = await refreshStockCatalog(
      { catalog: repo, quotes, clock: makeClock() },
      { tickers: ["BAD1", "BAD2"] },
    );
    expect(r).toEqual({ updated: 0, failed: 2 });
    expect(upsertMany).not.toHaveBeenCalled();
  });

  it("counts partial misses (3 sent, 2 returned) as 1 failed", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes } = makeQuotesSpy([[quote("PETR4", 100n), quote("VALE3", 200n)]]);
    const r = await refreshStockCatalog(
      { catalog: repo, quotes, clock: makeClock() },
      { tickers: ["PETR4", "VALE3", "BADX"] },
    );
    expect(r).toEqual({ updated: 2, failed: 1 });
    expect(upsertMany).toHaveBeenCalledTimes(1);
  });

  it("propagates missing companyName as null", async () => {
    const { repo, upsertMany } = makeCatalogSpy();
    const { quotes } = makeQuotesSpy([[quote("PETR4", 100n, null)]]);
    await refreshStockCatalog(
      { catalog: repo, quotes, clock: makeClock() },
      { tickers: ["PETR4"] },
    );
    expect(upsertMany).toHaveBeenCalledWith([
      expect.objectContaining({ ticker: "PETR4", companyName: null }),
    ]);
  });
});

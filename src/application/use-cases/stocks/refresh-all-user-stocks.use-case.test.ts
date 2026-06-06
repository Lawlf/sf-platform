import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import type { QuoteAdapter, StockQuoteResult } from "@/domain/ports/external/quote-adapter.port";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type {
  StockCatalogRepository,
  StockCatalogUpsertEntry,
} from "@/domain/ports/repositories/stock-catalog.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";

import { refreshAllUserStocks } from "./refresh-all-user-stocks.use-case";

function makeUser(id: string, overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id,
    email: `${id}@test.com`,
    emailVerifiedAt: new Date(),
    displayName: null,
    role: "user",
    plan: "pro",
    isPro: true,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null,
    homeTourDismissedAt: null,
    quickAccess: [],
    baseCurrency: "BRL",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeUserRepo(pro: UserEntity[]): UserRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    markOnboardingWizardSeen: vi.fn(),
    markHomeTourDismissed: vi.fn(),
    deactivate: vi.fn(),
    update: vi.fn(),
    findAllPro: vi.fn(async () => pro),
  };
}

function makeAssetRepo(byUser: Record<string, string[]>): AssetRepository {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async (userId: string) => byUser[userId] ?? []),
    softDelete: vi.fn(),
  };
}

function makeCatalogRepo() {
  const upsertMany = vi.fn(async (_entries: StockCatalogUpsertEntry[]) => undefined);
  const repo: StockCatalogRepository = {
    upsert: vi.fn(),
    upsertMany,
    findByTicker: vi.fn(async () => null),
    search: vi.fn(async () => []),
    listAll: vi.fn(async () => []),
    listStaleTickers: vi.fn(async () => []),
  };
  return { repo, upsertMany };
}

function makeQuotes(results: StockQuoteResult[][]) {
  let call = 0;
  const fetchQuotes = vi.fn(async () => {
    const r = results[call] ?? [];
    call += 1;
    return r;
  });
  const quotes: QuoteAdapter = {
    fetchQuote: vi.fn(async () => null),
    fetchQuotes,
    listAvailableStocks: vi.fn(async () => []),
  };
  return { quotes, fetchQuotes };
}

function quote(symbol: string, priceCents = 100n): StockQuoteResult {
  return {
    symbol,
    priceCents,
    currency: "BRL",
    fetchedAt: new Date("2026-05-20T10:00:00Z"),
    companyName: null,
  };
}

const CLOCK = { now: () => new Date("2026-05-20T10:00:00Z") };

describe("refreshAllUserStocks", () => {
  it("returns zeroed result when there are no Pro users", async () => {
    const users = makeUserRepo([]);
    const assets = makeAssetRepo({});
    const { repo: catalog, upsertMany } = makeCatalogRepo();
    const { quotes, fetchQuotes } = makeQuotes([]);
    const r = await refreshAllUserStocks({ users, assets, catalog, quotes, clock: CLOCK });
    expect(r).toEqual({ tickers: 0, updated: 0, failed: 0 });
    expect(fetchQuotes).not.toHaveBeenCalled();
    expect(upsertMany).not.toHaveBeenCalled();
  });

  it("returns zeroed result when Pro users hold no stocks", async () => {
    const users = makeUserRepo([makeUser("u1"), makeUser("u2")]);
    const assets = makeAssetRepo({ u1: [], u2: [] });
    const { repo: catalog } = makeCatalogRepo();
    const { quotes, fetchQuotes } = makeQuotes([]);
    const r = await refreshAllUserStocks({ users, assets, catalog, quotes, clock: CLOCK });
    expect(r).toEqual({ tickers: 0, updated: 0, failed: 0 });
    expect(fetchQuotes).not.toHaveBeenCalled();
  });

  it("deduplicates tickers across Pro users before fetching", async () => {
    const users = makeUserRepo([makeUser("u1"), makeUser("u2"), makeUser("u3")]);
    const assets = makeAssetRepo({
      u1: ["PETR4", "VALE3"],
      u2: ["PETR4", "ITUB4"],
      u3: ["vale3"],
    });
    const { repo: catalog, upsertMany } = makeCatalogRepo();
    const { quotes, fetchQuotes } = makeQuotes([[quote("ITUB4"), quote("PETR4"), quote("VALE3")]]);
    const r = await refreshAllUserStocks({ users, assets, catalog, quotes, clock: CLOCK });
    expect(r).toEqual({ tickers: 3, updated: 3, failed: 0 });
    expect(fetchQuotes).toHaveBeenCalledTimes(1);
    // tickers ordered alphabetically after sort
    expect(fetchQuotes).toHaveBeenCalledWith(["ITUB4", "PETR4", "VALE3"]);
    expect(upsertMany).toHaveBeenCalledTimes(1);
  });

  it("batches more than 10 unique tickers into multiple calls", async () => {
    const tickerLists = Array.from({ length: 23 }, (_, i) => `T${String(i).padStart(2, "0")}`);
    const users = makeUserRepo([makeUser("u1")]);
    const assets = makeAssetRepo({ u1: tickerLists });
    const { repo: catalog } = makeCatalogRepo();
    const { quotes, fetchQuotes } = makeQuotes([
      tickerLists.slice(0, 10).map((t) => quote(t)),
      tickerLists.slice(10, 20).map((t) => quote(t)),
      tickerLists.slice(20, 23).map((t) => quote(t)),
    ]);
    const r = await refreshAllUserStocks({ users, assets, catalog, quotes, clock: CLOCK });
    expect(r).toEqual({ tickers: 23, updated: 23, failed: 0 });
    expect(fetchQuotes).toHaveBeenCalledTimes(3);
  });

  it("propagates partial failures from refreshStockCatalog", async () => {
    const users = makeUserRepo([makeUser("u1")]);
    const assets = makeAssetRepo({ u1: ["PETR4", "BADX"] });
    const { repo: catalog } = makeCatalogRepo();
    const { quotes } = makeQuotes([[quote("PETR4")]]);
    const r = await refreshAllUserStocks({ users, assets, catalog, quotes, clock: CLOCK });
    expect(r).toEqual({ tickers: 2, updated: 1, failed: 1 });
  });
});

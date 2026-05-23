import type { Clock } from "@/domain/ports/clock.port";
import type { QuoteAdapter } from "@/domain/ports/external/quote-adapter.port";
import type { StockCatalogRepository } from "@/domain/ports/repositories/stock-catalog.repository";

export interface SeedStockCatalogInput {
  /**
   * Quantidade máxima de páginas a buscar da fonte externa. Default 5,
   * suficiente para o catálogo público da brapi sem estourar o plano.
   */
  maxPages?: number;
  /**
   * Tamanho de cada página de listagem. Default 100.
   */
  pageSize?: number;
}

export interface SeedStockCatalogDeps {
  catalog: StockCatalogRepository;
  quotes: QuoteAdapter;
  clock: Clock;
}

export interface SeedStockCatalogResult {
  inserted: number;
  pages: number;
}

/**
 * Popula o catálogo local de ações em lote, paginando a fonte externa
 * (ex.: brapi `/api/quote/list`) e upsertando o resultado.
 *
 * Use case puro: depende apenas de `QuoteAdapter`, `StockCatalogRepository`
 * e `Clock`. Para com a primeira página vazia (fim do catálogo / erro).
 */
export async function seedStockCatalog(
  deps: SeedStockCatalogDeps,
  input: SeedStockCatalogInput,
): Promise<SeedStockCatalogResult> {
  const maxPages = input.maxPages ?? 5;
  const pageSize = input.pageSize ?? 100;
  let inserted = 0;
  let pagesFetched = 0;

  for (let page = 1; page <= maxPages; page++) {
    const stocks = await deps.quotes.listAvailableStocks({
      limit: pageSize,
      page,
      sortBy: "volume",
      sortOrder: "desc",
    });
    if (stocks.length === 0) break;
    pagesFetched++;

    const now = deps.clock.now();
    const entries = stocks
      .filter((s) => s.priceCents !== null)
      .map((s) => ({
        ticker: s.ticker.toUpperCase(),
        companyName: s.name,
        lastPriceCents: s.priceCents as bigint,
        lastFetchedAt: now,
      }));

    if (entries.length > 0) {
      await deps.catalog.upsertMany(entries);
      inserted += entries.length;
    }
  }

  return { inserted, pages: pagesFetched };
}

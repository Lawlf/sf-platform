import type { Clock } from "@/domain/ports/clock.port";
import type { QuoteAdapter } from "@/domain/ports/external/quote-adapter.port";
import type { StockCatalogRepository } from "@/domain/ports/repositories/stock-catalog.repository";

export interface RefreshStockCatalogInput {
  /**
   * Lista de tickers a atualizar. Duplicados são removidos. Cada ticker é
   * normalizado para uppercase.
   */
  tickers: string[];
}

export interface RefreshStockCatalogDeps {
  catalog: StockCatalogRepository;
  quotes: QuoteAdapter;
  clock: Clock;
}

export interface RefreshStockCatalogResult {
  /**
   * Quantidade de tickers efetivamente atualizados no catálogo.
   */
  updated: number;
  /**
   * Tickers que foram solicitados mas não vieram na resposta (ticker
   * inválido, falha parcial de batch, etc.).
   */
  failed: number;
}

const BATCH_SIZE = 10;

/**
 * Atualiza o catálogo local de cotações em lote, respeitando o limite
 * de 10 tickers por request da brapi paga. Use case puro: depende apenas
 * de `QuoteAdapter`, `StockCatalogRepository` e `Clock`.
 */
export async function refreshStockCatalog(
  deps: RefreshStockCatalogDeps,
  input: RefreshStockCatalogInput,
): Promise<RefreshStockCatalogResult> {
  const unique = Array.from(
    new Set(
      input.tickers
        .map((t) => (typeof t === "string" ? t.trim().toUpperCase() : ""))
        .filter((t) => t.length > 0),
    ),
  );

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const results = await deps.quotes.fetchQuotes(batch);
    if (results.length === 0) {
      failed += batch.length;
      continue;
    }
    const now = deps.clock.now();
    const entries = results.map((r) => ({
      ticker: r.symbol,
      companyName: r.companyName ?? null,
      lastPriceCents: r.priceCents,
      lastFetchedAt: now,
    }));
    await deps.catalog.upsertMany(entries);
    updated += results.length;
    failed += batch.length - results.length;
  }

  return { updated, failed };
}

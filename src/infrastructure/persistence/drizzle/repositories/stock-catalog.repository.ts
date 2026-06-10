import { asc, eq, isNull, lt, or, sql } from "drizzle-orm";

import type {
  StockCatalogEntity,
  StockCatalogRepositoryPort,
  StockCatalogUpsertEntry,
} from "@/domain/ports/repositories/stock-catalog.repository";

import { getDb } from "../client";
import { stockCatalog, type StockCatalogRow } from "../schema/stock-catalog.schema";

function toEntity(row: StockCatalogRow): StockCatalogEntity {
  return {
    ticker: row.ticker,
    companyName: row.companyName,
    lastPriceCents: row.lastPriceCents,
    lastFetchedAt: row.lastFetchedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export class StockCatalogRepository implements StockCatalogRepositoryPort {
  async upsert(entry: StockCatalogUpsertEntry): Promise<void> {
    const ticker = normalizeTicker(entry.ticker);
    await getDb()
      .insert(stockCatalog)
      .values({
        ticker,
        companyName: entry.companyName,
        lastPriceCents: entry.lastPriceCents,
        lastFetchedAt: entry.lastFetchedAt,
      })
      .onConflictDoUpdate({
        target: stockCatalog.ticker,
        set: {
          companyName: entry.companyName,
          lastPriceCents: entry.lastPriceCents,
          lastFetchedAt: entry.lastFetchedAt,
          updatedAt: sql`now()`,
        },
      });
  }

  async upsertMany(entries: StockCatalogUpsertEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const values = entries.map((e) => ({
      ticker: normalizeTicker(e.ticker),
      companyName: e.companyName,
      lastPriceCents: e.lastPriceCents,
      lastFetchedAt: e.lastFetchedAt,
    }));
    await getDb()
      .insert(stockCatalog)
      .values(values)
      .onConflictDoUpdate({
        target: stockCatalog.ticker,
        set: {
          companyName: sql`excluded.company_name`,
          lastPriceCents: sql`excluded.last_price_cents`,
          lastFetchedAt: sql`excluded.last_fetched_at`,
          updatedAt: sql`now()`,
        },
      });
  }

  async findByTicker(ticker: string): Promise<StockCatalogEntity | null> {
    const normalized = normalizeTicker(ticker);
    const rows = await getDb()
      .select()
      .from(stockCatalog)
      .where(eq(stockCatalog.ticker, normalized))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async search(query: string, limit = 20): Promise<StockCatalogEntity[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    const pattern = `%${trimmed}%`;
    const rows = await getDb()
      .select()
      .from(stockCatalog)
      .where(
        or(
          sql`${stockCatalog.ticker} ILIKE ${pattern}`,
          sql`${stockCatalog.companyName} ILIKE ${pattern}`,
        ),
      )
      .orderBy(asc(stockCatalog.ticker))
      .limit(limit);
    return rows.map(toEntity);
  }

  async listAll(limit = 500): Promise<StockCatalogEntity[]> {
    const rows = await getDb()
      .select()
      .from(stockCatalog)
      .orderBy(asc(stockCatalog.ticker))
      .limit(limit);
    return rows.map(toEntity);
  }

  async listStaleTickers(thresholdHours: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
    const rows = await getDb()
      .select({ ticker: stockCatalog.ticker })
      .from(stockCatalog)
      .where(or(isNull(stockCatalog.lastFetchedAt), lt(stockCatalog.lastFetchedAt, cutoff)))
      .orderBy(asc(stockCatalog.ticker));
    return rows.map((r) => r.ticker);
  }
}

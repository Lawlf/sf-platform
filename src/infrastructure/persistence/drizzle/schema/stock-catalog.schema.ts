import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Catálogo local de cotações de ações. Espelha o estado mais recente
 * consultado da brapi.dev por ticker, para que múltiplos usuários
 * compartilhem a mesma cotação (1 fetch serve toda a base).
 *
 * `last_price_cents` em bigint (centavos) preserva precisão de divisão
 * por ações pequenas (ex.: BBAS3 a 28,495).
 */
export const stockCatalog = pgTable(
  "stock_catalog",
  {
    ticker: text("ticker").primaryKey(),
    companyName: text("company_name"),
    lastPriceCents: bigint("last_price_cents", { mode: "bigint" }),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    lastFetchedIdx: index("stock_catalog_last_fetched_idx").on(table.lastFetchedAt),
  }),
);

export type StockCatalogRow = typeof stockCatalog.$inferSelect;
export type NewStockCatalogRow = typeof stockCatalog.$inferInsert;

import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Catálogo local de cotações de cripto (CoinGecko). 1 preço por coinId,
 * compartilhado por todos os usuários (1 fetch serve a base). Alimentado pelo
 * cron diário e pelas leituras (cache-first), protege contra rate limit.
 */
export const cryptoPriceCatalog = pgTable(
  "crypto_price_catalog",
  {
    coinId: text("coin_id").primaryKey(),
    lastPriceCents: bigint("last_price_cents", { mode: "bigint" }),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    lastFetchedIdx: index("crypto_price_catalog_last_fetched_idx").on(table.lastFetchedAt),
  }),
);

export type CryptoPriceCatalogRow = typeof cryptoPriceCatalog.$inferSelect;
export type NewCryptoPriceCatalogRow = typeof cryptoPriceCatalog.$inferInsert;

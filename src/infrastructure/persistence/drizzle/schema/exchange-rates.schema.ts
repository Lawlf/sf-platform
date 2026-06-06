import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rateDecimal: text("rate_decimal").notNull(),
    source: text("source").notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqPairDaySource: unique("exchange_rates_pair_as_of_source_uniq").on(
      t.fromCurrency,
      t.toCurrency,
      t.asOf,
      t.source,
    ),
    byPairAsOf: index("exchange_rates_pair_as_of_idx").on(
      t.fromCurrency,
      t.toCurrency,
      t.asOf.desc(),
    ),
  }),
);

export type ExchangeRateRow = typeof exchangeRates.$inferSelect;
export type NewExchangeRateRow = typeof exchangeRates.$inferInsert;

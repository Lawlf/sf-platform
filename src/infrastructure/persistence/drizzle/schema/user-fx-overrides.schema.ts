import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const userFxOverrides = pgTable(
  "user_fx_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rateDecimal: text("rate_decimal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqUserPair: unique("user_fx_overrides_user_pair_uniq").on(
      t.userId,
      t.fromCurrency,
      t.toCurrency,
    ),
  }),
);

export type UserFxOverrideRow = typeof userFxOverrides.$inferSelect;
export type NewUserFxOverrideRow = typeof userFxOverrides.$inferInsert;

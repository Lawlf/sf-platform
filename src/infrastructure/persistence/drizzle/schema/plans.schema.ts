import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { billingInterval, paymentProvider } from "./billing-enums.schema";

export { billingInterval };

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    provider: paymentProvider("provider").notNull(),
    providerProductId: text("provider_product_id"),
    providerPriceId: text("provider_price_id"),
    priceCents: bigint("price_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    billingInterval: billingInterval("billing_interval").notNull(),
    features: jsonb("features").notNull().default(sql`'[]'::jsonb`),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("plans_slug_idx").on(table.slug),
    providerPriceIdx: uniqueIndex("plans_provider_price_id_idx")
      .on(table.provider, table.providerPriceId)
      .where(sql`${table.providerPriceId} IS NOT NULL`),
    activeIdx: index("plans_active_idx").on(table.active),
  }),
);

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;

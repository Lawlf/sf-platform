import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { paymentProvider, subscriptionStatus } from "./billing-enums.schema";
import { plans } from "./plans.schema";
import { users } from "./users.schema";

export { paymentProvider, subscriptionStatus };

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
    provider: paymentProvider("provider").notNull(),
    providerSubscriptionId: text("provider_subscription_id"),
    providerCustomerId: text("provider_customer_id"),
    status: subscriptionStatus("status").notNull(),
    priceCents: bigint("price_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("subscriptions_user_idx").on(table.userId),
    planIdx: index("subscriptions_plan_idx").on(table.planId),
    activeUserIdx: uniqueIndex("subscriptions_active_per_user_idx")
      .on(table.userId)
      .where(sql`${table.status} IN ('active', 'past_due', 'incomplete')`),
    providerSubIdIdx: uniqueIndex("subscriptions_provider_sub_id_idx")
      .on(table.provider, table.providerSubscriptionId)
      .where(sql`${table.providerSubscriptionId} IS NOT NULL`),
  }),
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;

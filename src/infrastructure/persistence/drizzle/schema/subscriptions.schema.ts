import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const paymentProvider = pgEnum("payment_provider", ["manual", "stripe"]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "incomplete",
  "active",
  "past_due",
  "canceled",
  "paused",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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

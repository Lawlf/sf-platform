import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  payload: jsonb("payload").notNull(),
});

export type StripeWebhookEventRow = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEventRow = typeof stripeWebhookEvents.$inferInsert;

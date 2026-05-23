import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { paymentProvider, subscriptions } from "./subscriptions.schema";
import { users } from "./users.schema";

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);

export const paymentMethod = pgEnum("payment_method", ["card", "pix", "manual"]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: paymentProvider("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    status: paymentStatus("status").notNull(),
    paymentMethod: paymentMethod("payment_method"),
    gatewayFeeCents: bigint("gateway_fee_cents", { mode: "bigint" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    rawEvent: jsonb("raw_event"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("payments_user_idx").on(table.userId),
    subscriptionIdx: index("payments_subscription_idx").on(table.subscriptionId),
    providerPaymentIdIdx: uniqueIndex("payments_provider_payment_id_idx")
      .on(table.provider, table.providerPaymentId)
      .where(sql`${table.providerPaymentId} IS NOT NULL`),
  }),
);

export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;

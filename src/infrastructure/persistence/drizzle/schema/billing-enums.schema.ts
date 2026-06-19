import { pgEnum } from "drizzle-orm/pg-core";

export const paymentProvider = pgEnum("payment_provider", ["manual", "stripe", "google_play"]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "incomplete",
  "active",
  "past_due",
  "canceled",
  "paused",
]);

export const billingInterval = pgEnum("billing_interval", ["month", "year", "lifetime"]);

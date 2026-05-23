export type SubscriptionStatus =
  | "incomplete"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export type PaymentProvider = "manual" | "stripe";

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

export interface Subscription {
  id: string;
  userId: string;
  provider: PaymentProvider;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  status: SubscriptionStatus;
  priceCents: bigint;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stripe is the source of truth for status. Webhooks (`invoice.paid`,
 * `invoice.payment_failed`, `customer.subscription.updated`) sync the status
 * in near real-time, so we do NOT cross-check `currentPeriodEnd` against
 * `now` when status is "active". This avoids false-deny when a renewal
 * webhook is briefly delayed.
 */
export function isSubscriptionActive(sub: Subscription, now: Date): boolean {
  if (sub.status === "active") return true;
  if (sub.status === "past_due") {
    const graceEnd = new Date(sub.currentPeriodEnd.getTime() + GRACE_PERIOD_MS);
    return now < graceEnd;
  }
  return false;
}

export function nextBillingDate(sub: Subscription): Date | null {
  if (sub.cancelAtPeriodEnd) return null;
  if (sub.status !== "active" && sub.status !== "past_due") return null;
  return sub.currentPeriodEnd;
}

export function accessEndDate(sub: Subscription): Date {
  if (sub.status === "past_due") {
    return new Date(sub.currentPeriodEnd.getTime() + GRACE_PERIOD_MS);
  }
  return sub.currentPeriodEnd;
}

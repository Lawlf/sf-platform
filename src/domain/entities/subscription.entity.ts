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
  if (sub.status === "canceled") return null;
  return sub.currentPeriodEnd;
}

export function accessEndDate(sub: Subscription): Date {
  if (sub.status === "past_due") {
    return new Date(sub.currentPeriodEnd.getTime() + GRACE_PERIOD_MS);
  }
  return sub.currentPeriodEnd;
}

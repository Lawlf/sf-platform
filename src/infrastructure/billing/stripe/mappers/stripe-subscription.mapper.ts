import type Stripe from "stripe";

import type { SubscriptionStatus } from "@/domain/entities/subscription.entity";
import type { ProviderSubscriptionSnapshot } from "@/domain/ports/external/billing-provider.port";

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "trialing":
      return "active";
    case "paused":
      return "paused";
    default:
      return "incomplete";
  }
}

function customerIdOf(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

function periodOf(sub: Stripe.Subscription): { start: Date; end: Date } {
  const item = sub.items.data[0];
  if (!item) {
    const now = new Date();
    return { start: now, end: now };
  }
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

function priceIdOf(sub: Stripe.Subscription): string | null {
  const item = sub.items.data[0];
  if (!item) return null;
  const price = item.price;
  return price ? price.id : null;
}

export function mapStripeSubscription(sub: Stripe.Subscription): ProviderSubscriptionSnapshot {
  const period = periodOf(sub);
  return {
    providerSubscriptionId: sub.id,
    providerCustomerId: customerIdOf(sub),
    providerPriceId: priceIdOf(sub),
    status: mapStatus(sub.status),
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    endedAt: sub.ended_at ? new Date(sub.ended_at * 1000) : null,
  };
}

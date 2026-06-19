import type { SubscriptionStatus } from "@/domain/entities/subscription.entity";
import type { ProviderSubscriptionSnapshot } from "@/domain/ports/external/billing-provider.port";

import type { SubscriptionPurchaseV2 } from "./google-play-client";

const FAR_FUTURE = new Date("2099-12-31T23:59:59Z");

function parseTime(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function mapState(state: SubscriptionPurchaseV2["subscriptionState"], expiry: Date, now: Date): {
  status: SubscriptionStatus;
  endedAt: Date | null;
} {
  switch (state) {
    case "SUBSCRIPTION_STATE_ACTIVE":
      return { status: "active", endedAt: null };
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return { status: "past_due", endedAt: null };
    case "SUBSCRIPTION_STATE_ON_HOLD":
      return { status: "past_due", endedAt: null };
    case "SUBSCRIPTION_STATE_PAUSED":
      return { status: "paused", endedAt: null };
    case "SUBSCRIPTION_STATE_CANCELED":
      // Canceled = auto-renew off; access persists until expiry. Still active
      // while the paid period runs, then expires.
      return expiry > now
        ? { status: "active", endedAt: null }
        : { status: "canceled", endedAt: expiry };
    case "SUBSCRIPTION_STATE_EXPIRED":
      return { status: "canceled", endedAt: expiry };
    case "SUBSCRIPTION_STATE_PENDING":
    case "SUBSCRIPTION_STATE_UNSPECIFIED":
    default:
      return { status: "incomplete", endedAt: null };
  }
}

/**
 * Mapeia o SubscriptionPurchaseV2 da Play Developer API pro snapshot agnóstico de
 * provider. `purchaseToken` é o identificador estável da assinatura (não vem no
 * corpo da resposta). `now` torna a função pura/testável.
 */
export function mapSubscriptionV2ToSnapshot(
  purchaseToken: string,
  v2: SubscriptionPurchaseV2,
  now: Date,
): ProviderSubscriptionSnapshot {
  const lineItem = v2.lineItems?.[0];
  const start = parseTime(v2.startTime, now);
  const expiry = parseTime(lineItem?.expiryTime, FAR_FUTURE);
  const { status, endedAt } = mapState(v2.subscriptionState, expiry, now);

  const autoRenew = lineItem?.autoRenewingPlan?.autoRenewEnabled ?? false;
  const cancelAtPeriodEnd =
    !autoRenew &&
    (v2.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" ||
      v2.subscriptionState === "SUBSCRIPTION_STATE_CANCELED");

  return {
    providerSubscriptionId: purchaseToken,
    providerCustomerId:
      v2.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? "google-play",
    providerPriceId: lineItem?.productId ?? null,
    status,
    currentPeriodStart: start,
    currentPeriodEnd: expiry,
    cancelAtPeriodEnd,
    canceledAt: status === "canceled" ? endedAt : null,
    endedAt,
  };
}

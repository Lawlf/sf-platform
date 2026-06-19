import { describe, expect, it } from "vitest";

import type { SubscriptionPurchaseV2 } from "./google-play-client";
import { mapSubscriptionV2ToSnapshot } from "./google-play-event.mapper";

const NOW = new Date("2026-06-19T12:00:00Z");

function purchase(overrides: Partial<SubscriptionPurchaseV2> = {}): SubscriptionPurchaseV2 {
  return {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    startTime: "2026-06-01T00:00:00Z",
    latestOrderId: "GPA.0001",
    lineItems: [
      {
        productId: "pro_monthly",
        expiryTime: "2026-07-01T00:00:00Z",
        autoRenewingPlan: { autoRenewEnabled: true },
      },
    ],
    ...overrides,
  };
}

describe("mapSubscriptionV2ToSnapshot", () => {
  it("maps an active auto-renewing purchase", () => {
    const snap = mapSubscriptionV2ToSnapshot("tok_1", purchase(), NOW);
    expect(snap.providerSubscriptionId).toBe("tok_1");
    expect(snap.providerPriceId).toBe("pro_monthly");
    expect(snap.status).toBe("active");
    expect(snap.cancelAtPeriodEnd).toBe(false);
    expect(snap.currentPeriodEnd).toEqual(new Date("2026-07-01T00:00:00Z"));
    expect(snap.endedAt).toBeNull();
  });

  it("maps grace period to past_due", () => {
    const snap = mapSubscriptionV2ToSnapshot(
      "t",
      purchase({ subscriptionState: "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" }),
      NOW,
    );
    expect(snap.status).toBe("past_due");
  });

  it("keeps a canceled-but-unexpired purchase active with cancelAtPeriodEnd", () => {
    const snap = mapSubscriptionV2ToSnapshot(
      "t",
      purchase({
        subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
        lineItems: [
          {
            productId: "pro_monthly",
            expiryTime: "2026-07-01T00:00:00Z",
            autoRenewingPlan: { autoRenewEnabled: false },
          },
        ],
      }),
      NOW,
    );
    expect(snap.status).toBe("active");
    expect(snap.cancelAtPeriodEnd).toBe(true);
  });

  it("maps an expired purchase to canceled with endedAt", () => {
    const snap = mapSubscriptionV2ToSnapshot(
      "t",
      purchase({
        subscriptionState: "SUBSCRIPTION_STATE_EXPIRED",
        lineItems: [{ productId: "pro_monthly", expiryTime: "2026-06-01T00:00:00Z" }],
      }),
      NOW,
    );
    expect(snap.status).toBe("canceled");
    expect(snap.endedAt).toEqual(new Date("2026-06-01T00:00:00Z"));
  });

  it("maps a canceled purchase past its expiry to canceled", () => {
    const snap = mapSubscriptionV2ToSnapshot(
      "t",
      purchase({
        subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
        lineItems: [{ productId: "pro_monthly", expiryTime: "2026-06-01T00:00:00Z" }],
      }),
      NOW,
    );
    expect(snap.status).toBe("canceled");
  });

  it("maps pending to incomplete", () => {
    const snap = mapSubscriptionV2ToSnapshot(
      "t",
      purchase({ subscriptionState: "SUBSCRIPTION_STATE_PENDING" }),
      NOW,
    );
    expect(snap.status).toBe("incomplete");
  });
});

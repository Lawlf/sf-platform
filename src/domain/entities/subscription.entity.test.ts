import { describe, expect, it } from "vitest";

import {
  accessEndDate,
  isSubscriptionActive,
  nextBillingDate,
  type Subscription,
} from "./subscription.entity";

function baseSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_1",
    userId: "user_1",
    planId: null,
    provider: "stripe",
    providerSubscriptionId: "sub_stripe_1",
    providerCustomerId: "cus_1",
    status: "active",
    priceCents: 1490n,
    currency: "BRL",
    currentPeriodStart: new Date("2026-05-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-06-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("isSubscriptionActive", () => {
  it("active status is always active", () => {
    const now = new Date("2026-05-15T00:00:00Z");
    expect(isSubscriptionActive(baseSub({ status: "active" }), now)).toBe(true);
  });

  it("past_due is active during 3-day grace after currentPeriodEnd", () => {
    const sub = baseSub({
      status: "past_due",
      currentPeriodEnd: new Date("2026-06-01T00:00:00Z"),
    });
    expect(isSubscriptionActive(sub, new Date("2026-06-03T00:00:00Z"))).toBe(true);
    expect(isSubscriptionActive(sub, new Date("2026-06-04T01:00:00Z"))).toBe(false);
  });

  it("canceled is never active", () => {
    expect(isSubscriptionActive(baseSub({ status: "canceled" }), new Date())).toBe(false);
  });

  it("incomplete is never active", () => {
    expect(isSubscriptionActive(baseSub({ status: "incomplete" }), new Date())).toBe(false);
  });

  it("paused is never active", () => {
    expect(isSubscriptionActive(baseSub({ status: "paused" }), new Date())).toBe(false);
  });
});

describe("nextBillingDate", () => {
  it("returns currentPeriodEnd when active and not scheduled to cancel", () => {
    const sub = baseSub();
    expect(nextBillingDate(sub)?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("returns null when cancelAtPeriodEnd is true", () => {
    expect(nextBillingDate(baseSub({ cancelAtPeriodEnd: true }))).toBeNull();
  });

  it("returns null when status is canceled", () => {
    expect(nextBillingDate(baseSub({ status: "canceled" }))).toBeNull();
  });

  it("returns null when status is incomplete", () => {
    expect(nextBillingDate(baseSub({ status: "incomplete" }))).toBeNull();
  });

  it("returns null when status is paused", () => {
    expect(nextBillingDate(baseSub({ status: "paused" }))).toBeNull();
  });
});

describe("accessEndDate", () => {
  it("returns currentPeriodEnd for active sub", () => {
    expect(accessEndDate(baseSub()).toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("adds 3-day grace for past_due", () => {
    const d = accessEndDate(baseSub({ status: "past_due" }));
    expect(d.toISOString()).toBe("2026-06-04T00:00:00.000Z");
  });
});

import { describe, expect, it, vi } from "vitest";

import type { Subscription } from "@/domain/entities/subscription.entity";
import { NoActiveSubscriptionError } from "@/domain/errors/billing-errors";
import { isErr, isOk } from "@/shared/errors";

import { cancelSubscription } from "./cancel-subscription.use-case";

const NOW = new Date("2026-05-22T12:00:00Z");

function makeSub(provider: "manual" | "stripe", id = "sub_x"): Subscription {
  return {
    id: "sub_local_1",
    userId: "user_1",
    planId: null,
    provider,
    providerSubscriptionId: provider === "stripe" ? id : null,
    providerCustomerId: provider === "stripe" ? "cus_1" : null,
    status: "active",
    priceCents: 1490n,
    currency: "BRL",
    currentPeriodStart: NOW,
    currentPeriodEnd: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("cancelSubscription", () => {
  it("calls billing.cancelAtPeriodEnd for stripe sub", async () => {
    const cancel = vi.fn(async () => undefined);
    const r = await cancelSubscription(
      {
        subscriptions: { findActiveByUserId: vi.fn(async () => makeSub("stripe")), save: vi.fn() } as never,
        billing: { cancelAtPeriodEnd: cancel } as never,
        clock: { now: () => NOW },
      },
      { userId: "user_1" },
    );
    expect(isOk(r)).toBe(true);
    expect(cancel).toHaveBeenCalledWith("sub_x");
  });

  it("flips local fields for manual sub without calling billing", async () => {
    const cancel = vi.fn();
    const save = vi.fn(async (_s: Subscription) => undefined);
    const r = await cancelSubscription(
      {
        subscriptions: { findActiveByUserId: vi.fn(async () => makeSub("manual")), save } as never,
        billing: { cancelAtPeriodEnd: cancel } as never,
        clock: { now: () => NOW },
      },
      { userId: "user_1" },
    );
    expect(isOk(r)).toBe(true);
    expect(cancel).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    const saved = save.mock.calls[0]?.[0];
    expect(saved?.cancelAtPeriodEnd).toBe(true);
    expect(saved?.canceledAt).toEqual(NOW);
  });

  it("returns NoActiveSubscriptionError when none exists", async () => {
    const r = await cancelSubscription(
      {
        subscriptions: { findActiveByUserId: vi.fn(async () => null), save: vi.fn() } as never,
        billing: { cancelAtPeriodEnd: vi.fn() } as never,
        clock: { now: () => NOW },
      },
      { userId: "user_1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(NoActiveSubscriptionError);
  });
});

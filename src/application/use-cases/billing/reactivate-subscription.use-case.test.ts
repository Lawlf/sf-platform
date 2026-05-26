import { describe, expect, it, vi } from "vitest";

import { NoActiveSubscriptionError } from "@/domain/errors/billing-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { reactivateSubscription } from "./reactivate-subscription.use-case";

const NOW = new Date("2026-05-22T12:00:00Z");

describe("reactivateSubscription", () => {
  it("calls billing.reactivate for stripe sub", async () => {
    const reactivate = vi.fn(async () => undefined);
    const sub = {
      id: "s1",
      userId: "u1",
      planId: null,
      provider: "stripe" as const,
      providerSubscriptionId: "sub_x",
      providerCustomerId: "cus_1",
      status: "active" as const,
      priceCents: 1490n,
      currency: "BRL",
      currentPeriodStart: NOW,
      currentPeriodEnd: new Date(NOW.getTime() + 30 * 86400000),
      cancelAtPeriodEnd: true,
      canceledAt: NOW,
      endedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = await reactivateSubscription(
      {
        subscriptions: { findActiveByUserId: vi.fn(async () => sub), save: vi.fn() } as never,
        billing: { reactivate } as never,
        clock: { now: () => NOW },
      },
      { userId: "u1" },
    );
    expect(isOk(r)).toBe(true);
    expect(reactivate).toHaveBeenCalledWith("sub_x");
  });

  it("returns NoActiveSubscriptionError when no sub", async () => {
    const r = await reactivateSubscription(
      {
        subscriptions: { findActiveByUserId: vi.fn(async () => null), save: vi.fn() } as never,
        billing: { reactivate: vi.fn() } as never,
        clock: { now: () => NOW },
      },
      { userId: "u1" },
    );
    expect(isErr(r)).toBe(true);
  });
});

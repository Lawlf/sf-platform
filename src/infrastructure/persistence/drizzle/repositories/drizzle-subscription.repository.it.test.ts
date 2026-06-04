import { eq, like } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Subscription } from "@/domain/entities/subscription.entity";

import { getDb } from "../client";
import { subscriptions } from "../schema/subscriptions.schema";
import { users } from "../schema/users.schema";

import { DrizzleSubscriptionRepository } from "./drizzle-subscription.repository";

describe("DrizzleSubscriptionRepository (IT)", () => {
  const repo = new DrizzleSubscriptionRepository();
  let userId: string;

  beforeEach(async () => {
    const [row] = await getDb()
      .insert(users)
      .values({ email: `sub-test-${Date.now()}@example.com` })
      .returning({ id: users.id });
    if (!row) throw new Error("failed to seed user");
    userId = row.id;
  });

  afterEach(async () => {
    await getDb().delete(subscriptions).where(eq(subscriptions.userId, userId));
    await getDb().delete(users).where(like(users.email, "sub-test-%"));
  });

  it("saves and retrieves a subscription", async () => {
    const now = new Date();
    const sub: Subscription = {
      id: crypto.randomUUID(),
      userId,
      planId: null,
      provider: "stripe",
      providerSubscriptionId: "sub_xyz",
      providerCustomerId: "cus_xyz",
      status: "active",
      priceCents: 1490n,
      currency: "BRL",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await repo.save(sub);
    const loaded = await repo.findById(sub.id);
    expect(loaded?.providerSubscriptionId).toBe("sub_xyz");
    expect(loaded?.priceCents).toBe(1490n);
    expect(loaded?.status).toBe("active");
  });

  it("findActiveByUserId returns sub when active", async () => {
    const sub: Subscription = makeSub(userId, { status: "active" });
    await repo.save(sub);
    const found = await repo.findActiveByUserId(userId);
    expect(found?.id).toBe(sub.id);
  });

  it("findActiveByUserId returns null when only canceled exists", async () => {
    await repo.save(makeSub(userId, { status: "canceled", endedAt: new Date() }));
    const found = await repo.findActiveByUserId(userId);
    expect(found).toBeNull();
  });

  it("save upserts existing subscription", async () => {
    const sub = makeSub(userId, { status: "active" });
    await repo.save(sub);
    sub.status = "past_due";
    sub.updatedAt = new Date();
    await repo.save(sub);
    const loaded = await repo.findById(sub.id);
    expect(loaded?.status).toBe("past_due");
  });

  it("findByProviderSubscriptionId looks up by stripe id", async () => {
    const sub = makeSub(userId, { providerSubscriptionId: "sub_uniq" });
    await repo.save(sub);
    const found = await repo.findByProviderSubscriptionId("stripe", "sub_uniq");
    expect(found?.id).toBe(sub.id);
  });

  function makeSub(userId: string, overrides: Partial<Subscription> = {}): Subscription {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      userId,
      planId: null,
      provider: "stripe",
      providerSubscriptionId: `sub_${crypto.randomUUID()}`,
      providerCustomerId: "cus_test",
      status: "active",
      priceCents: 1490n,
      currency: "BRL",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }
});

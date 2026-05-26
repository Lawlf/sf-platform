import { describe, expect, it } from "vitest";

import type { Subscription } from "@/domain/entities/subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import { isOk } from "@/shared/errors/result";

import { revokeProManually } from "./revoke-pro-manually.use-case";

function proUser(): UserEntity {
  return {
    id: "u1", email: "a@b.com", emailVerifiedAt: new Date(), displayName: "A",
    role: "user", plan: "pro", isPro: true, deactivatedAt: null, deactivationReason: null,
    contentDiagnosticAnswer: null, contentDiagnosticAnsweredAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  } as UserEntity;
}

function manualSub(): Subscription {
  return {
    id: "s1", userId: "u1", planId: null, provider: "manual", providerSubscriptionId: null,
    providerCustomerId: null, status: "active", priceCents: 0n, currency: "BRL",
    currentPeriodStart: new Date(), currentPeriodEnd: new Date("2099-12-31T23:59:59Z"),
    cancelAtPeriodEnd: false, canceledAt: null, endedAt: null, createdAt: new Date(), updatedAt: new Date(),
  };
}

function deps() {
  let user = proUser();
  const subs: Subscription[] = [manualSub()];
  const sent: string[] = [];
  return {
    state: { get user() { return user; }, subs, sent },
    users: {
      findById: async () => user,
      update: async (u: UserEntity) => { user = u; },
    },
    subscriptions: {
      findActiveByUserId: async () => subs.find((s) => s.status === "active") ?? null,
      save: async (s: Subscription) => {
        const i = subs.findIndex((x) => x.id === s.id);
        if (i >= 0) subs[i] = s; else subs.push(s);
      },
    },
    email: { send: async (m: { subject: string }) => { sent.push(m.subject); } },
    clock: { now: () => new Date("2026-05-23T12:00:00Z") },
    appUrl: "https://app.test",
  };
}

describe("revokeProManually", () => {
  it("cancels the manual sub and downgrades the user to free", async () => {
    const d = deps();
    const r = await revokeProManually(d as never, { userId: "u1", adminId: "admin1" });
    expect(isOk(r)).toBe(true);
    expect(d.state.subs[0]?.status).toBe("canceled");
    expect(d.state.subs[0]?.canceledAt?.toISOString()).toBe("2026-05-23T12:00:00.000Z");
    expect(d.state.subs[0]?.endedAt).not.toBeNull();
    expect(d.state.user.isPro).toBe(false);
    expect(d.state.user.plan).toBe("free");
  });

  it("returns err when there is no active manual sub", async () => {
    const d = deps();
    d.state.subs[0]!.provider = "stripe";
    const r = await revokeProManually(d as never, { userId: "u1", adminId: "admin1" });
    expect(isOk(r)).toBe(false);
  });
});

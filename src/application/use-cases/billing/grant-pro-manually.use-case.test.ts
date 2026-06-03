import { describe, expect, it } from "vitest";

import type { Payment } from "@/domain/entities/payment.entity";
import type { Subscription } from "@/domain/entities/subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import { isOk } from "@/shared/errors/result";

import { grantProManually } from "./grant-pro-manually.use-case";

function makeUser(over: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "u1",
    email: "a@b.com",
    emailVerifiedAt: new Date(),
    displayName: "A",
    role: "user",
    plan: "free",
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as UserEntity;
}

function deps() {
  let user = makeUser();
  const subs: Subscription[] = [];
  const payments: Payment[] = [];
  const sent: string[] = [];
  return {
    state: { get user() { return user; }, subs, payments, sent },
    users: {
      findById: async (id: string) => (id === user.id ? user : null),
      update: async (u: UserEntity) => { user = u; },
    },
    subscriptions: {
      findActiveByUserId: async () => subs.find((s) => s.status === "active") ?? null,
      save: async (s: Subscription) => {
        const i = subs.findIndex((x) => x.id === s.id);
        if (i >= 0) subs[i] = s; else subs.push(s);
      },
    },
    payments: { save: async (p: Payment) => { payments.push(p); } },
    plans: { findBySlug: async () => null },
    email: { send: async (m: { subject: string }) => { sent.push(m.subject); } },
    clock: { now: () => new Date("2026-05-23T12:00:00Z") },
    appUrl: "https://app.test",
  };
}

describe("grantProManually", () => {
  it("creates a manual active sub with priceCents 0 and a R$0 succeeded payment, and flips user to Pro", async () => {
    const d = deps();
    const r = await grantProManually(d as never, {
      userId: "u1",
      grant: { kind: "lifetime" },
      adminId: "admin1",
    });
    expect(isOk(r)).toBe(true);
    expect(d.state.subs).toHaveLength(1);
    expect(d.state.subs[0]?.provider).toBe("manual");
    expect(d.state.subs[0]?.status).toBe("active");
    expect(d.state.subs[0]?.priceCents).toBe(0n);
    expect(d.state.subs[0]?.planId).toBeNull();
    expect(d.state.payments).toHaveLength(1);
    expect(d.state.payments[0]?.amountCents).toBe(0n);
    expect(d.state.payments[0]?.status).toBe("succeeded");
    expect(d.state.payments[0]?.paymentMethod).toBe("manual");
    expect(d.state.user.isPro).toBe(true);
    expect(d.state.user.plan).toBe("pro");
  });

  it("period grant sets currentPeriodEnd N months ahead", async () => {
    const d = deps();
    await grantProManually(d as never, {
      userId: "u1",
      grant: { kind: "period", months: 3 },
      adminId: "admin1",
    });
    expect(d.state.subs[0]?.currentPeriodEnd.toISOString()).toBe("2026-08-23T12:00:00.000Z");
  });

  it("returns err when the user does not exist", async () => {
    const d = deps();
    const r = await grantProManually(d as never, {
      userId: "nope",
      grant: { kind: "lifetime" },
      adminId: "admin1",
    });
    expect(isOk(r)).toBe(false);
  });

  it("persists the subscription and payment inside the same transaction", async () => {
    const d = deps();
    let inTx = false;
    const savedInTx: boolean[] = [];
    const baseSubSave = d.subscriptions.save;
    const basePaymentSave = d.payments.save;
    d.subscriptions.save = async (s: Subscription) => {
      savedInTx.push(inTx);
      return baseSubSave(s);
    };
    d.payments.save = async (p: Payment) => {
      savedInTx.push(inTx);
      return basePaymentSave(p);
    };
    const withTx = {
      ...d,
      transaction: async <T>(fn: () => Promise<T>): Promise<T> => {
        inTx = true;
        try {
          return await fn();
        } finally {
          inTx = false;
        }
      },
    };
    const r = await grantProManually(withTx as never, {
      userId: "u1",
      grant: { kind: "lifetime" },
      adminId: "admin1",
    });
    expect(isOk(r)).toBe(true);
    // Both financial writes ran while the transaction was open.
    expect(savedInTx).toEqual([true, true]);
  });
});

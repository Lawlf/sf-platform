import { describe, expect, it, vi } from "vitest";

import type { Payment } from "@/domain/entities/payment.entity";
import type { Plan } from "@/domain/entities/plan.entity";
import type { Subscription } from "@/domain/entities/subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import type { ProviderSubscriptionSnapshot } from "@/domain/ports/external/billing-provider.port";
import type { PaymentRepositoryPort } from "@/domain/ports/repositories/payment.repository";
import type { PlanRepositoryPort } from "@/domain/ports/repositories/plan.repository";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { isErr, isOk } from "@/shared/errors/result";

import {
  type GooglePlaySubscriptionDetail,
  verifyGooglePlayPurchase,
} from "./verify-google-play-purchase.use-case";

const NOW = new Date("2026-06-19T12:00:00Z");

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user_1",
    email: "test@example.com",
    emailVerifiedAt: new Date(),
    displayName: "Teste",
    role: "user",
    plan: "free",
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null,
    homeTourDismissedAt: null,
    quickAccess: [],
    username: null,
    profileFlair: null,
    baseCurrency: "BRL",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePlan(): Plan {
  return {
    id: "plan_1",
    slug: "pro-monthly-android",
    name: "PRO Mensal",
    provider: "google_play",
    providerProductId: "pro_monthly",
    providerPriceId: "pro_monthly",
    priceCents: 1990n,
    currency: "BRL",
    billingInterval: "month",
    features: [],
    active: true,
    sortOrder: 11,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function snapshot(overrides: Partial<ProviderSubscriptionSnapshot> = {}): ProviderSubscriptionSnapshot {
  return {
    providerSubscriptionId: "tok_1",
    providerCustomerId: "cust_1",
    providerPriceId: "pro_monthly",
    status: "active",
    currentPeriodStart: new Date("2026-06-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    ...overrides,
  };
}

function makeDeps(detail: GooglePlaySubscriptionDetail, user = makeUser()) {
  const subs = new Map<string, Subscription>();
  const payments: Payment[] = [];
  let currentUser = user;
  const emailsSent: string[] = [];
  const acknowledge = vi.fn(async () => {});

  const subscriptions = {
    findById: async (id: string) => subs.get(id) ?? null,
    findByProviderSubscriptionId: async (provider: string, pid: string) =>
      [...subs.values()].find((s) => s.provider === provider && s.providerSubscriptionId === pid) ??
      null,
    findActiveByUserId: async (uid: string) =>
      [...subs.values()].find(
        (s) => s.userId === uid && (s.status === "active" || s.status === "past_due"),
      ) ?? null,
    findAllByUserId: async (uid: string) => [...subs.values()].filter((s) => s.userId === uid),
    findLiveByProvider: async () => [],
    countByPlanId: async () => 0,
    findEndedBetween: async () => [],
    save: async (sub: Subscription) => {
      subs.set(sub.id, sub);
    },
  } as unknown as SubscriptionRepositoryPort;

  const paymentsRepo = {
    findByProviderPaymentId: async (provider: string, id: string) =>
      payments.find((p) => p.provider === provider && p.providerPaymentId === id) ?? null,
    save: async (p: Payment) => {
      const i = payments.findIndex((x) => x.id === p.id);
      if (i >= 0) payments[i] = p;
      else payments.push(p);
    },
  } as unknown as PaymentRepositoryPort;

  const plans = {
    findByProviderPriceId: async () => makePlan(),
  } as unknown as PlanRepositoryPort;

  const users = {
    findById: async (id: string) => (id === currentUser.id ? currentUser : null),
    update: async (u: UserEntity) => {
      currentUser = u;
    },
  } as unknown as UserRepositoryPort;

  const email = {
    send: async (m: { to: string }) => {
      emailsSent.push(m.to);
    },
  } as unknown as EmailService;

  const deps = {
    subscriptions,
    payments: paymentsRepo,
    plans,
    users,
    email,
    clock: { now: () => NOW },
    appUrl: "https://saborfinanceiro.com.br",
    play: {
      provider: "google_play" as const,
      getSubscriptionDetail: async () => detail,
      acknowledge,
    },
  };

  return { deps, subs, payments, acknowledge, currentUser: () => currentUser };
}

describe("verifyGooglePlayPurchase", () => {
  it("grants PRO and records subscription + payment on an active purchase", async () => {
    const { deps, subs, payments, acknowledge, currentUser } = makeDeps({
      snapshot: snapshot(),
      latestOrderId: "GPA.0001",
      acknowledged: false,
    });

    const result = await verifyGooglePlayPurchase(deps, {
      userId: "user_1",
      sku: "pro_monthly",
      purchaseToken: "tok_1",
    });

    expect(isOk(result)).toBe(true);
    expect(currentUser().isPro).toBe(true);
    expect(currentUser().plan).toBe("pro");
    const saved = [...subs.values()][0];
    expect(saved?.provider).toBe("google_play");
    expect(saved?.providerSubscriptionId).toBe("tok_1");
    expect(payments).toHaveLength(1);
    expect(payments[0]?.providerPaymentId).toBe("GPA.0001");
    expect(acknowledge).toHaveBeenCalledOnce();
  });

  it("is idempotent across repeats (single payment, no error)", async () => {
    const fixture = makeDeps({
      snapshot: snapshot(),
      latestOrderId: "GPA.0001",
      acknowledged: false,
    });

    await verifyGooglePlayPurchase(fixture.deps, {
      userId: "user_1",
      sku: "pro_monthly",
      purchaseToken: "tok_1",
    });
    const second = await verifyGooglePlayPurchase(fixture.deps, {
      userId: "user_1",
      sku: "pro_monthly",
      purchaseToken: "tok_1",
    });

    expect(isOk(second)).toBe(true);
    expect(fixture.subs.size).toBe(1);
    expect(fixture.payments).toHaveLength(1);
  });

  it("rejects a purchase that is not active and does not grant PRO", async () => {
    const { deps, currentUser } = makeDeps({
      snapshot: snapshot({ status: "incomplete" }),
      latestOrderId: null,
      acknowledged: false,
    });

    const result = await verifyGooglePlayPurchase(deps, {
      userId: "user_1",
      sku: "pro_monthly",
      purchaseToken: "tok_1",
    });

    expect(isErr(result)).toBe(true);
    expect(currentUser().isPro).toBe(false);
  });

  it("skips acknowledge when the purchase is already acknowledged", async () => {
    const { deps, acknowledge } = makeDeps({
      snapshot: snapshot(),
      latestOrderId: "GPA.0001",
      acknowledged: true,
    });

    await verifyGooglePlayPurchase(deps, {
      userId: "user_1",
      sku: "pro_monthly",
      purchaseToken: "tok_1",
    });

    expect(acknowledge).not.toHaveBeenCalled();
  });
});

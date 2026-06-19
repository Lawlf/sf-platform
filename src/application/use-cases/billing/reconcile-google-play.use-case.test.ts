import { describe, expect, it } from "vitest";

import type { Subscription } from "@/domain/entities/subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import type { ProviderSubscriptionSnapshot } from "@/domain/ports/external/billing-provider.port";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";

import { reconcileGooglePlay } from "./reconcile-google-play.use-case";

const NOW = new Date("2026-06-19T12:00:00Z");

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user_1",
    email: "test@example.com",
    emailVerifiedAt: new Date(),
    displayName: "Teste",
    role: "user",
    plan: "pro",
    isPro: true,
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

function makeSub(): Subscription {
  return {
    id: "sub_1",
    userId: "user_1",
    planId: "plan_1",
    provider: "google_play",
    providerSubscriptionId: "tok_1",
    providerCustomerId: "cust_1",
    status: "active",
    priceCents: 1990n,
    currency: "BRL",
    currentPeriodStart: new Date("2026-05-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-06-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
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

function makeDeps(snap: ProviderSubscriptionSnapshot, user = makeUser()) {
  const subs = new Map<string, Subscription>([["sub_1", makeSub()]]);
  let currentUser = user;

  const subscriptions = {
    findById: async (id: string) => subs.get(id) ?? null,
    findByProviderSubscriptionId: async () => null,
    findActiveByUserId: async (uid: string) =>
      [...subs.values()].find(
        (s) => s.userId === uid && (s.status === "active" || s.status === "past_due"),
      ) ?? null,
    findAllByUserId: async () => [...subs.values()],
    findLiveByProvider: async (provider: string) =>
      [...subs.values()].filter(
        (s) =>
          s.provider === provider &&
          ["active", "past_due", "paused", "incomplete"].includes(s.status),
      ),
    countByPlanId: async () => 0,
    findEndedBetween: async () => [],
    save: async (sub: Subscription) => {
      subs.set(sub.id, sub);
    },
  } as unknown as SubscriptionRepositoryPort;

  const users = {
    findById: async (id: string) => (id === currentUser.id ? currentUser : null),
    update: async (u: UserEntity) => {
      currentUser = u;
    },
  } as unknown as UserRepositoryPort;

  const email = { send: async () => {} } as unknown as EmailService;

  const deps = {
    subscriptions,
    users,
    email,
    clock: { now: () => NOW },
    appUrl: "https://saborfinanceiro.com.br",
    play: {
      provider: "google_play" as const,
      getSubscription: async () => snap,
    },
  };

  return { deps, subs, currentUser: () => currentUser };
}

describe("reconcileGooglePlay", () => {
  it("downgrades a subscription that expired on Play", async () => {
    const { deps, subs, currentUser } = makeDeps(
      snapshot({ status: "canceled", endedAt: new Date("2026-06-01T00:00:00Z") }),
    );

    const result = await reconcileGooglePlay(deps);

    expect(result.checked).toBe(1);
    expect(result.downgraded).toBe(1);
    expect(currentUser().isPro).toBe(false);
    expect(subs.get("sub_1")?.status).toBe("canceled");
  });

  it("keeps an active subscription Pro", async () => {
    const { deps, currentUser } = makeDeps(snapshot({ status: "active" }));

    const result = await reconcileGooglePlay(deps);

    expect(result.downgraded).toBe(0);
    expect(currentUser().isPro).toBe(true);
  });
});

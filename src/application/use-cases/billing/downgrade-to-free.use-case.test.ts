import { describe, expect, it, vi } from "vitest";

import type { Subscription } from "@/domain/entities/subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";

import { downgradeToFree } from "./downgrade-to-free.use-case";

const NOW = new Date("2026-05-22T12:00:00Z");

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user_1",
    email: "t@example.com",
    emailVerifiedAt: NOW,
    displayName: "T",
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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeDeps(opts: { user: UserEntity; otherActive: Subscription | null }) {
  const usersUpdated: UserEntity[] = [];
  const emailsSent: string[] = [];
  return {
    users: {
      findById: vi.fn(async () => opts.user),
      update: vi.fn(async (u: UserEntity) => {
        usersUpdated.push(u);
      }),
    } as unknown as UserRepository,
    subscriptions: {
      findActiveByUserId: vi.fn(async () => opts.otherActive),
    } as unknown as SubscriptionRepository,
    email: {
      send: vi.fn(async (m: { subject: string }) => {
        emailsSent.push(m.subject);
      }),
    } as unknown as EmailService,
    clock: { now: () => NOW } satisfies Clock,
    appUrl: "https://saborfinanceiro.com.br",
    usersUpdated,
    emailsSent,
  };
}

describe("downgradeToFree", () => {
  it("flips Pro to Free and sends ended email", async () => {
    const deps = makeDeps({ user: makeUser(), otherActive: null });
    await downgradeToFree(deps, "user_1");
    expect(deps.usersUpdated[0]?.isPro).toBe(false);
    expect(deps.usersUpdated[0]?.plan).toBe("free");
    expect(deps.emailsSent).toHaveLength(1);
  });

  it("does nothing if user has another active subscription", async () => {
    const otherSub: Subscription = {
      id: "sub_2",
      userId: "user_1",
      planId: null,
      provider: "manual",
      providerSubscriptionId: null,
      providerCustomerId: null,
      status: "active",
      priceCents: 0n,
      currency: "BRL",
      currentPeriodStart: NOW,
      currentPeriodEnd: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const deps = makeDeps({ user: makeUser(), otherActive: otherSub });
    await downgradeToFree(deps, "user_1");
    expect(deps.usersUpdated).toHaveLength(0);
    expect(deps.emailsSent).toHaveLength(0);
  });

  it("no-op flip when user already Free but still sends ended email", async () => {
    const deps = makeDeps({ user: makeUser({ isPro: false, plan: "free" }), otherActive: null });
    await downgradeToFree(deps, "user_1");
    expect(deps.usersUpdated).toHaveLength(0);
    expect(deps.emailsSent).toHaveLength(1);
  });
});

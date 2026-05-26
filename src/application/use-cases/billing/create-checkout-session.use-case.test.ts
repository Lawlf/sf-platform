import { describe, expect, it, vi } from "vitest";

import type { Plan } from "@/domain/entities/plan.entity";
import {
  AlreadySubscribedError,
  PlanNotCheckoutReadyError,
  PlanNotFoundError,
} from "@/domain/errors/billing-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { createCheckoutSession } from "./create-checkout-session.use-case";

const NOW = new Date("2026-05-22T12:00:00Z");
const FUTURE = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);

function makeUser() {
  return {
    id: "user_1",
    email: "t@example.com",
    emailVerifiedAt: NOW,
    displayName: "T",
    role: "user" as const,
    plan: "free" as const,
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan_1",
    slug: "pro-monthly",
    name: "PRO Mensal",
    provider: "stripe",
    providerProductId: "prod_xxx",
    providerPriceId: "price_xxx",
    priceCents: 1990n,
    currency: "BRL",
    billingInterval: "month",
    features: [],
    active: true,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeDeps(opts: { user: unknown; activeSub: unknown; plan: Plan | null }) {
  return {
    users: { findById: vi.fn(async () => opts.user) } as never,
    subscriptions: { findActiveByUserId: vi.fn(async () => opts.activeSub) } as never,
    plans: { findBySlug: vi.fn(async () => opts.plan) } as never,
    billing: {
      provider: "stripe" as const,
      createCheckoutSession: vi.fn(async () => ({
        sessionId: "cs_1",
        redirectUrl: "https://checkout.stripe.com/cs_1",
      })),
    } as never,
    clock: { now: () => NOW },
    appUrl: "https://saborfinanceiro.com.br",
  };
}

describe("createCheckoutSession", () => {
  it("returns redirectUrl for Free user", async () => {
    const deps = makeDeps({ user: makeUser(), activeSub: null, plan: makePlan() });
    const r = await createCheckoutSession(deps, { userId: "user_1" });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.redirectUrl).toContain("checkout.stripe.com");
  });

  it("rejects when user already has active sub", async () => {
    const sub = { status: "active", currentPeriodEnd: FUTURE };
    const deps = makeDeps({ user: makeUser(), activeSub: sub, plan: makePlan() });
    const r = await createCheckoutSession(deps, { userId: "user_1" });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(AlreadySubscribedError);
  });

  it("rejects when plan slug not found", async () => {
    const deps = makeDeps({ user: makeUser(), activeSub: null, plan: null });
    const r = await createCheckoutSession(deps, { userId: "user_1", planSlug: "missing" });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(PlanNotFoundError);
  });

  it("rejects when plan has no providerPriceId", async () => {
    const deps = makeDeps({
      user: makeUser(),
      activeSub: null,
      plan: makePlan({ providerPriceId: null }),
    });
    const r = await createCheckoutSession(deps, { userId: "user_1" });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(PlanNotCheckoutReadyError);
  });

  it("rejects when plan inactive", async () => {
    const deps = makeDeps({
      user: makeUser(),
      activeSub: null,
      plan: makePlan({ active: false }),
    });
    const r = await createCheckoutSession(deps, { userId: "user_1" });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(PlanNotCheckoutReadyError);
  });
});

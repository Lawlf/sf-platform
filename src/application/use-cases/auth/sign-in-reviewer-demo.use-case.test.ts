import { describe, expect, it, vi } from "vitest";

import { MagicLinkInvalid } from "@/domain/errors/auth-errors";

import { signInReviewerDemo } from "./sign-in-reviewer-demo.use-case";

type Deps = Parameters<typeof signInReviewerDemo>[0];

const fixedNow = new Date("2030-01-15T12:00:00.000Z");
const CONFIG = { email: "review-demo@saborfinanceiro.com.br", code: "135790" };

function makeUser(overrides: Partial<{ id: string; isPro: boolean; plan: "free" | "pro" }> = {}) {
  return {
    id: overrides.id ?? "demo-user",
    email: CONFIG.email,
    emailVerifiedAt: new Date("2030-01-01T00:00:00.000Z"),
    displayName: null,
    username: null,
    role: "user" as const,
    plan: overrides.plan ?? ("free" as const),
    isPro: overrides.isPro ?? false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  };
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  const users = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    findByUsername: vi.fn(),
    create: vi.fn().mockResolvedValue(makeUser()),
    markEmailVerified: vi.fn(),
    markOnboardingWizardSeen: vi.fn(),
    markHomeTourDismissed: vi.fn(),
    deactivate: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    findAllPro: vi.fn(),
    findAllActive: vi.fn(),
  };
  const subscriptions = {
    findById: vi.fn(),
    findByProviderSubscriptionId: vi.fn(),
    findActiveByUserId: vi.fn().mockResolvedValue(null),
    findAllByUserId: vi.fn(),
    countByPlanId: vi.fn(),
    findEndedBetween: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const profiles = { ensurePfProfile: vi.fn().mockResolvedValue({ id: "profile-1" }) };
  const sessions = {
    findByIdHash: vi.fn(),
    findWithUserByIdHash: vi.fn(),
    listActiveForUser: vi.fn(),
    create: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    deleteAllForUser: vi.fn(),
    deleteExpired: vi.fn(),
  };
  const hasher = {
    sha256Hex: vi.fn().mockResolvedValue("session-id-hash"),
    hash: vi.fn(),
    verify: vi.fn(),
  };
  const random = { urlToken: vi.fn().mockReturnValue("raw-session"), code: vi.fn() };
  const clock = { now: () => fixedNow };
  return {
    users,
    subscriptions,
    profiles,
    sessions,
    hasher,
    random,
    clock,
    ...overrides,
  } as unknown as Deps;
}

describe("signInReviewerDemo", () => {
  it("rejects a wrong code without touching repos", async () => {
    const deps = makeDeps();
    const result = await signInReviewerDemo(deps, CONFIG, {
      emailRaw: CONFIG.email,
      code: "000000",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkInvalid);
    expect(deps.users.findByEmail).not.toHaveBeenCalled();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("rejects a non-demo email", async () => {
    const deps = makeDeps();
    const result = await signInReviewerDemo(deps, CONFIG, {
      emailRaw: "someone-else@example.com",
      code: CONFIG.code,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    expect(deps.users.findByEmail).not.toHaveBeenCalled();
  });

  it("creates the demo user as Pro and issues a session on the right credential", async () => {
    const deps = makeDeps();
    const result = await signInReviewerDemo(deps, CONFIG, {
      emailRaw: CONFIG.email.toUpperCase(),
      code: CONFIG.code,
      ip: "1.1.1.1",
      userAgent: "ua",
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.create).toHaveBeenCalledWith({
      email: CONFIG.email,
      emailVerified: true,
    });
    expect(deps.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ isPro: true, plan: "pro" }),
    );
    expect(deps.subscriptions.save).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "manual", status: "active" }),
    );
    expect(deps.profiles.ensurePfProfile).toHaveBeenCalledWith("demo-user", fixedNow);
    expect(deps.sessions.create).toHaveBeenCalled();
    if (result._tag === "ok") expect(result.value.rawSessionId).toBe("raw-session");
  });

  it("does not re-grant Pro when the demo account already has an active subscription", async () => {
    const deps = makeDeps();
    deps.users.findByEmail = vi.fn().mockResolvedValue(makeUser({ isPro: true, plan: "pro" }));
    deps.subscriptions.findActiveByUserId = vi.fn().mockResolvedValue({ id: "existing-sub" });
    const result = await signInReviewerDemo(deps, CONFIG, {
      emailRaw: CONFIG.email,
      code: CONFIG.code,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.create).not.toHaveBeenCalled();
    expect(deps.users.update).not.toHaveBeenCalled();
    expect(deps.subscriptions.save).not.toHaveBeenCalled();
  });
});

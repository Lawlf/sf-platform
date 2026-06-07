import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";

import { getOnboardingState } from "./get-onboarding-state.use-case";

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "u1",
    email: "a@b.com",
    emailVerifiedAt: new Date(),
    displayName: null,
    role: "user",
    plan: "free",
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: "guardar",
    contentDiagnosticAnsweredAt: new Date(),
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

describe("getOnboardingState", () => {
  it("composes flags, focus, and the derived checklist", async () => {
    const deps = {
      users: { findById: vi.fn().mockResolvedValue(makeUser()) },
      counts: {
        hasIncome: vi.fn().mockResolvedValue(true),
        hasDebt: vi.fn().mockResolvedValue(false),
        hasAsset: vi.fn().mockResolvedValue(false),
        hasGoal: vi.fn().mockResolvedValue(true),
      },
    } as unknown as Parameters<typeof getOnboardingState>[0];
    const result = await getOnboardingState(deps, { userId: "u1" });
    expect(result).toEqual({
      wizardSeen: false,
      tourDismissed: false,
      focus: "guardar",
      checklist: { hasIncome: true, hasDebt: false, hasAsset: false, hasGoal: true },
    });
  });

  it("treats a missing user as fully unseen with an empty checklist", async () => {
    const deps = {
      users: { findById: vi.fn().mockResolvedValue(null) },
      counts: {
        hasIncome: vi.fn(),
        hasDebt: vi.fn(),
        hasAsset: vi.fn(),
        hasGoal: vi.fn(),
      },
    } as unknown as Parameters<typeof getOnboardingState>[0];
    const result = await getOnboardingState(deps, { userId: "missing" });
    expect(result.wizardSeen).toBe(false);
    expect(result.checklist).toEqual({
      hasIncome: false,
      hasDebt: false,
      hasAsset: false,
      hasGoal: false,
    });
  });
});

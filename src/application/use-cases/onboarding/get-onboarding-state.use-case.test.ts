import { describe, expect, it, vi } from "vitest";

import type { ProfileEntity } from "@/domain/entities/profile.entity";
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
    acquisitionChannel: null,
    acquisitionChannelOther: null,
    quickAccess: [],
    username: null,
    profileFlair: null,
    baseCurrency: "BRL",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProfile(over: Partial<ProfileEntity> = {}): ProfileEntity {
  return {
    id: "p1",
    userId: "u1",
    type: "PF",
    linkedProfileId: null,
    displayName: null,
    isPrimary: true,
    taxClassification: null,
    checklistDebtDismissedAt: null,
    checklistGoalDismissedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as ProfileEntity;
}

describe("getOnboardingState", () => {
  it("composes flags, focus, and the derived checklist", async () => {
    const deps = {
      users: { findById: vi.fn().mockResolvedValue(makeUser()) },
      profiles: { findById: vi.fn().mockResolvedValue(makeProfile()) },
      counts: {
        hasIncome: vi.fn().mockResolvedValue(true),
        hasDebt: vi.fn().mockResolvedValue(false),
        hasAsset: vi.fn().mockResolvedValue(false),
        hasGoal: vi.fn().mockResolvedValue(true),
      },
    } as unknown as Parameters<typeof getOnboardingState>[0];
    const result = await getOnboardingState(deps, { userId: "u1", profileId: "p1" });
    expect(result).toEqual({
      wizardSeen: false,
      tourDismissed: false,
      focus: "guardar",
      checklist: {
        hasIncome: true,
        hasDebt: false,
        hasAsset: false,
        hasGoal: true,
        debtDismissed: false,
        goalDismissed: false,
      },
    });
  });

  it("treats a missing user as fully unseen with an empty checklist", async () => {
    const deps = {
      users: { findById: vi.fn().mockResolvedValue(null) },
      profiles: { findById: vi.fn() },
      counts: {
        hasIncome: vi.fn(),
        hasDebt: vi.fn(),
        hasAsset: vi.fn(),
        hasGoal: vi.fn(),
      },
    } as unknown as Parameters<typeof getOnboardingState>[0];
    const result = await getOnboardingState(deps, { userId: "missing", profileId: "p1" });
    expect(result.wizardSeen).toBe(false);
    expect(result.checklist).toEqual({
      hasIncome: false,
      hasDebt: false,
      hasAsset: false,
      hasGoal: false,
      debtDismissed: false,
      goalDismissed: false,
    });
  });

  it("expoe dispensa de divida e meta a partir dos timestamps do perfil ativo", async () => {
    const deps = {
      users: {
        findById: vi.fn().mockResolvedValue(makeUser()),
      },
      profiles: {
        findById: vi
          .fn()
          .mockResolvedValue(
            makeProfile({ checklistDebtDismissedAt: new Date(), checklistGoalDismissedAt: null }),
          ),
      },
      counts: {
        hasIncome: vi.fn().mockResolvedValue(true),
        hasDebt: vi.fn().mockResolvedValue(false),
        hasAsset: vi.fn().mockResolvedValue(true),
        hasGoal: vi.fn().mockResolvedValue(false),
      },
    } as unknown as Parameters<typeof getOnboardingState>[0];
    const result = await getOnboardingState(deps, { userId: "u1", profileId: "p1" });
    expect(result.checklist.debtDismissed).toBe(true);
    expect(result.checklist.goalDismissed).toBe(false);
  });
});

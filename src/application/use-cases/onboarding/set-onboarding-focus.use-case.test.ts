import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import { isOk } from "@/shared/errors/result";

import { setOnboardingFocus } from "./set-onboarding-focus.use-case";

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
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null,
    homeTourDismissedAt: null,
    quickAccess: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("setOnboardingFocus", () => {
  it("persists the focus for a free user (no Pro gate)", async () => {
    const user = makeUser({ isPro: false });
    const update = vi.fn().mockResolvedValue(undefined);
    const fixedNow = new Date("2026-05-30T12:00:00Z");
    const deps = {
      users: { findById: vi.fn().mockResolvedValue(user), update },
      clock: { now: () => fixedNow },
    } as unknown as Parameters<typeof setOnboardingFocus>[0];
    const result = await setOnboardingFocus(deps, {
      userId: "u1",
      focus: "pagar-divida",
    });
    expect(isOk(result)).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        contentDiagnosticAnswer: "pagar-divida",
        contentDiagnosticAnsweredAt: fixedNow,
      }),
    );
  });

  it("returns an error when the user does not exist", async () => {
    const deps = {
      users: { findById: vi.fn().mockResolvedValue(null), update: vi.fn() },
      clock: { now: () => new Date() },
    } as unknown as Parameters<typeof setOnboardingFocus>[0];
    const result = await setOnboardingFocus(deps, {
      userId: "missing",
      focus: "guardar",
    });
    expect(isOk(result)).toBe(false);
  });
});

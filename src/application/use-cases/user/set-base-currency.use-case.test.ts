import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import { UserNotFound } from "@/domain/errors/auth-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { InvalidBaseCurrency, setBaseCurrency } from "./set-base-currency.use-case";

type Deps = Parameters<typeof setBaseCurrency>[0];

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user-1",
    email: "test@example.com",
    emailVerifiedAt: null,
    displayName: "Name",
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
    baseCurrency: "BRL",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeDeps(user: UserEntity | null): Deps {
  const fixedNow = new Date("2026-05-19T12:00:00Z");
  const users = {
    findById: vi.fn().mockResolvedValue(user),
    findByEmail: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    markOnboardingWizardSeen: vi.fn(),
    markHomeTourDismissed: vi.fn(),
    deactivate: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    findAllPro: vi.fn().mockResolvedValue([]),
  };
  const clock = { now: vi.fn().mockReturnValue(fixedNow) };
  return { users, clock } as Deps;
}

describe("setBaseCurrency", () => {
  it("persists the chosen currency", async () => {
    const deps = makeDeps(makeUser());
    const result = await setBaseCurrency(deps, { userId: "user-1", currency: "USD" });

    expect(isOk(result)).toBe(true);
    expect(deps.users.update).toHaveBeenCalledTimes(1);
    const updateArg = (deps.users.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateArg.baseCurrency).toBe("USD");
    expect(updateArg.updatedAt).toEqual(new Date("2026-05-19T12:00:00Z"));
  });

  it("keeps BRL byte-identical when chosen", async () => {
    const deps = makeDeps(makeUser());
    const result = await setBaseCurrency(deps, { userId: "user-1", currency: "BRL" });
    expect(isOk(result)).toBe(true);
    const updateArg = (deps.users.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateArg.baseCurrency).toBe("BRL");
  });

  it("rejects an unsupported currency", async () => {
    const deps = makeDeps(makeUser());
    const result = await setBaseCurrency(deps, {
      userId: "user-1",
      currency: "JPY" as never,
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidBaseCurrency);
      expect(result.error.code).toBe("INVALID_BASE_CURRENCY");
    }
    expect(deps.users.update).not.toHaveBeenCalled();
  });

  it("returns UserNotFound when the user does not exist", async () => {
    const deps = makeDeps(null);
    const result = await setBaseCurrency(deps, { userId: "ghost", currency: "USD" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(UserNotFound);
    }
    expect(deps.users.update).not.toHaveBeenCalled();
  });
});

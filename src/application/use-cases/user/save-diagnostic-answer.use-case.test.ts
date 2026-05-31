import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import { UserNotFound } from "@/domain/errors/auth-errors";
import { isErr, isOk } from "@/shared/errors/result";

import {
  DiagnosticForbiddenForFree,
  saveDiagnosticAnswer,
} from "./save-diagnostic-answer.use-case";

type Deps = Parameters<typeof saveDiagnosticAnswer>[0];

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user-1",
    email: "test@example.com",
    emailVerifiedAt: null,
    displayName: null,
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
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeDeps(user: UserEntity | null): Deps {
  const fixedNow = new Date("2026-05-22T12:00:00Z");
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

describe("saveDiagnosticAnswer", () => {
  it("persists answer and timestamp for a Pro user", async () => {
    const user = makeUser();
    const deps = makeDeps(user);
    const result = await saveDiagnosticAnswer(deps, {
      userId: "user-1",
      answer: "pagar-divida",
    });

    expect(isOk(result)).toBe(true);
    const updateArg = (deps.users.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateArg.contentDiagnosticAnswer).toBe("pagar-divida");
    expect(updateArg.contentDiagnosticAnsweredAt).toEqual(new Date("2026-05-22T12:00:00Z"));
    expect(updateArg.updatedAt).toEqual(new Date("2026-05-22T12:00:00Z"));
  });

  it("rejects Free user with DiagnosticForbiddenForFree", async () => {
    const user = makeUser({ isPro: false, plan: "free" });
    const deps = makeDeps(user);
    const result = await saveDiagnosticAnswer(deps, {
      userId: "user-1",
      answer: "guardar",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DiagnosticForbiddenForFree);
      expect(result.error.code).toBe("DIAGNOSTIC_FORBIDDEN_FOR_FREE");
    }
    expect(deps.users.update).not.toHaveBeenCalled();
  });

  it("returns UserNotFound when user does not exist", async () => {
    const deps = makeDeps(null);
    const result = await saveDiagnosticAnswer(deps, {
      userId: "ghost",
      answer: "investir",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(UserNotFound);
    expect(deps.users.update).not.toHaveBeenCalled();
  });

  it("overwrites an existing answer (user changing trilha)", async () => {
    const user = makeUser({
      contentDiagnosticAnswer: "pagar-divida",
      contentDiagnosticAnsweredAt: new Date("2026-05-01T00:00:00Z"),
    });
    const deps = makeDeps(user);
    const result = await saveDiagnosticAnswer(deps, {
      userId: "user-1",
      answer: "investir",
    });

    expect(isOk(result)).toBe(true);
    const updateArg = (deps.users.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateArg.contentDiagnosticAnswer).toBe("investir");
    expect(updateArg.contentDiagnosticAnsweredAt).toEqual(new Date("2026-05-22T12:00:00Z"));
  });
});

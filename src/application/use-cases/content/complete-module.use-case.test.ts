import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import { UserNotFound } from "@/domain/errors/auth-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { completeModule, ModuleCompletionForbiddenForFree } from "./complete-module.use-case";

type Deps = Parameters<typeof completeModule>[0];

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user-1",
    email: "test@example.com",
    emailVerifiedAt: null,
    displayName: null,
    role: "user",
    plan: "pro",
    isPro: true,
    proGraceUntil: null,
    freeKeptProfileId: null,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null,
    homeTourDismissedAt: null,
    acquisitionChannel: null,
    acquisitionChannelOther: null,
    quickAccess: [],
    username: null,
    profileFlair: null,
    baseCurrency: "BRL",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeDeps(user: UserEntity | null) {
  const fixedNow = new Date("2026-05-26T12:00:00Z");
  const users = { findById: vi.fn().mockResolvedValue(user) };
  const progress = {
    markCompleted: vi.fn().mockImplementation(async (i) => ({
      id: "mp-1",
      userId: i.userId,
      trilhaSlug: i.trilhaSlug,
      moduleNum: i.moduleNum,
      completedAt: i.completedAt,
      createdAt: i.completedAt,
    })),
    findCompletedNums: vi.fn().mockResolvedValue([]),
  };
  const clock = { now: vi.fn().mockReturnValue(fixedNow) };
  return { users, progress, clock } as unknown as Deps;
}

describe("completeModule", () => {
  it("marca módulo concluído para usuário Pro", async () => {
    const deps = makeDeps(makeUser());
    const result = await completeModule(deps, {
      userId: "user-1",
      trilhaSlug: "sair-do-vermelho",
      moduleNum: 1,
    });
    expect(isOk(result)).toBe(true);
    const arg = (deps.progress.markCompleted as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      userId: "user-1",
      trilhaSlug: "sair-do-vermelho",
      moduleNum: 1,
      completedAt: new Date("2026-05-26T12:00:00Z"),
    });
  });

  it("rejeita usuário Free com ModuleCompletionForbiddenForFree", async () => {
    const deps = makeDeps(makeUser({ isPro: false, plan: "free" }));
    const result = await completeModule(deps, {
      userId: "user-1",
      trilhaSlug: "sair-do-vermelho",
      moduleNum: 1,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(ModuleCompletionForbiddenForFree);
  });

  it("rejeita usuário inexistente com UserNotFound", async () => {
    const deps = makeDeps(null);
    const result = await completeModule(deps, {
      userId: "ghost",
      trilhaSlug: "sair-do-vermelho",
      moduleNum: 1,
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(UserNotFound);
  });
});

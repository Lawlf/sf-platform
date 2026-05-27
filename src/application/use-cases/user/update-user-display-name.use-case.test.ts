import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import { UserNotFound } from "@/domain/errors/auth-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { InvalidDisplayName, updateUserDisplayName } from "./update-user-display-name.use-case";

type Deps = Parameters<typeof updateUserDisplayName>[0];

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user-1",
    email: "test@example.com",
    emailVerifiedAt: null,
    displayName: "Old Name",
    role: "user",
    plan: "free",
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    quickAccess: [],
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
    deactivate: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    findAllPro: vi.fn().mockResolvedValue([]),
  };
  const clock = { now: vi.fn().mockReturnValue(fixedNow) };
  return { users, clock } as Deps;
}

describe("updateUserDisplayName", () => {
  it("happy path: trims and updates the display name", async () => {
    const user = makeUser();
    const deps = makeDeps(user);
    const result = await updateUserDisplayName(deps, {
      userId: "user-1",
      displayName: "  New Name  ",
    });

    expect(isOk(result)).toBe(true);
    expect(deps.users.update).toHaveBeenCalledTimes(1);
    const updateArg = (deps.users.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateArg.id).toBe("user-1");
    expect(updateArg.displayName).toBe("New Name");
    expect(updateArg.updatedAt).toEqual(new Date("2026-05-19T12:00:00Z"));
  });

  it("returns InvalidDisplayName when name is empty after trim", async () => {
    const deps = makeDeps(makeUser());
    const result = await updateUserDisplayName(deps, {
      userId: "user-1",
      displayName: "   ",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidDisplayName);
      expect(result.error.code).toBe("INVALID_DISPLAY_NAME");
    }
    expect(deps.users.update).not.toHaveBeenCalled();
  });

  it("returns InvalidDisplayName when name is over 120 characters", async () => {
    const deps = makeDeps(makeUser());
    const tooLong = "a".repeat(121);
    const result = await updateUserDisplayName(deps, {
      userId: "user-1",
      displayName: tooLong,
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidDisplayName);
    }
    expect(deps.users.update).not.toHaveBeenCalled();
  });

  it("returns UserNotFound when user does not exist", async () => {
    const deps = makeDeps(null);
    const result = await updateUserDisplayName(deps, {
      userId: "ghost",
      displayName: "Any Name",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(UserNotFound);
      expect(result.error.code).toBe("USER_NOT_FOUND");
    }
    expect(deps.users.update).not.toHaveBeenCalled();
  });
});

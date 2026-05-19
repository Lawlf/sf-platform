import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";

import type * as CurrentUserModule from "./current-user";

const cookieMock = {
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(cookieMock),
}));

const redirectMock = vi.fn().mockImplementation((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const loadCurrentUserMock = vi.fn();

vi.mock("./current-user", async () => {
  const actual = await vi.importActual<typeof CurrentUserModule>("./current-user");
  return {
    ...actual,
    loadCurrentUser: loadCurrentUserMock,
  };
});

const { requireUser, requireAdmin } = await import("./require-user");

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user-1",
    email: "u@e.com",
    emailVerifiedAt: new Date("2030-01-01T00:00:00.000Z"),
    displayName: null,
    role: "user",
    plan: "free",
    deactivatedAt: null,
    deactivationReason: null,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

// Deps shape is irrelevant since loadCurrentUser is mocked; cast to satisfy the type.
const fakeDeps = {} as Parameters<typeof requireUser>[0];

describe("requireUser", () => {
  beforeEach(() => {
    loadCurrentUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects to /entrar when no user is present", async () => {
    loadCurrentUserMock.mockResolvedValueOnce(null);
    await expect(requireUser(fakeDeps)).rejects.toThrow("REDIRECT:/entrar");
    expect(redirectMock).toHaveBeenCalledWith("/entrar");
  });

  it("returns the user when present", async () => {
    const user = makeUser();
    loadCurrentUserMock.mockResolvedValueOnce(user);
    const result = await requireUser(fakeDeps);
    expect(result).toBe(user);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    loadCurrentUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects to /nao-encontrado when the user is not an admin", async () => {
    loadCurrentUserMock.mockResolvedValueOnce(makeUser({ role: "user" }));
    await expect(requireAdmin(fakeDeps)).rejects.toThrow("REDIRECT:/nao-encontrado");
    expect(redirectMock).toHaveBeenCalledWith("/nao-encontrado");
  });

  it("returns the user when role is admin", async () => {
    const admin = makeUser({ role: "admin" });
    loadCurrentUserMock.mockResolvedValueOnce(admin);
    const result = await requireAdmin(fakeDeps);
    expect(result).toBe(admin);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

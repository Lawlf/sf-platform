import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionEntity } from "@/domain/entities/session.entity";
import type { UserEntity } from "@/domain/entities/user.entity";

const cookieMock = {
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(cookieMock),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("REDIRECT");
  }),
}));

const { loadCurrentUser } = await import("./current-user");

type Deps = Parameters<typeof loadCurrentUser>[0];

const fixedNow = new Date("2030-06-01T00:00:00.000Z");

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user-1",
    email: "u@e.com",
    emailVerifiedAt: new Date("2030-01-01T00:00:00.000Z"),
    displayName: null,
    role: "user",
    plan: "free",
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    quickAccess: [],
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionEntity> = {}): SessionEntity {
  return {
    idHash: "a".repeat(64),
    userId: "user-1",
    expiresAt: new Date("2030-07-01T00:00:00.000Z"),
    createdAt: new Date("2030-05-01T00:00:00.000Z"),
    lastUsedAt: new Date("2030-05-15T00:00:00.000Z"),
    ip: null,
    userAgent: null,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  const sessions = {
    findByIdHash: vi.fn().mockResolvedValue(null),
    findWithUserByIdHash: vi.fn().mockResolvedValue(null),
    listActiveForUser: vi.fn(),
    create: vi.fn(),
    touch: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteAllForUser: vi.fn(),
  };
  const users = {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    deactivate: vi.fn(),
    update: vi.fn(),
    findAllPro: vi.fn().mockResolvedValue([]),
  };
  const hasher = { sha256Hex: vi.fn().mockResolvedValue("a".repeat(64)) };
  return { sessions, users, hasher, now: fixedNow, ...overrides } as Deps;
}

describe("loadCurrentUser", () => {
  beforeEach(() => {
    cookieMock.get.mockReset();
  });

  it("returns null when no session cookie is present", async () => {
    cookieMock.get.mockReturnValue(undefined);
    const deps = makeDeps();
    const result = await loadCurrentUser(deps);
    expect(result).toBeNull();
    expect(deps.sessions.findWithUserByIdHash).not.toHaveBeenCalled();
  });

  it("returns null when the cookie has no matching session", async () => {
    cookieMock.get.mockReturnValue({ value: "raw-session" });
    const deps = makeDeps();
    (deps.sessions.findWithUserByIdHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const result = await loadCurrentUser(deps);
    expect(result).toBeNull();
    expect(deps.hasher.sha256Hex).toHaveBeenCalledWith("raw-session");
    expect(deps.sessions.delete).not.toHaveBeenCalled();
  });

  it("deletes the expired session and returns null", async () => {
    cookieMock.get.mockReturnValue({ value: "raw-session" });
    const expired = makeSession({
      expiresAt: new Date(fixedNow.getTime() - 1000),
    });
    const deps = makeDeps();
    (deps.sessions.findWithUserByIdHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      session: expired,
      user: makeUser(),
    });
    const result = await loadCurrentUser(deps);
    expect(result).toBeNull();
    expect(deps.sessions.delete).toHaveBeenCalledWith("a".repeat(64));
    expect(deps.sessions.touch).not.toHaveBeenCalled();
  });

  it("returns null when the session's user is deactivated", async () => {
    cookieMock.get.mockReturnValue({ value: "raw-session" });
    const deps = makeDeps();
    (deps.sessions.findWithUserByIdHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      session: makeSession(),
      user: makeUser({ deactivatedAt: new Date("2030-05-01T00:00:00.000Z") }),
    });
    const result = await loadCurrentUser(deps);
    expect(result).toBeNull();
    expect(deps.sessions.touch).not.toHaveBeenCalled();
  });

  it("returns the user and extends the session when last touch is stale", async () => {
    cookieMock.get.mockReturnValue({ value: "raw-session" });
    const session = makeSession({
      lastUsedAt: new Date(fixedNow.getTime() - 10 * 60 * 1000),
    });
    const user = makeUser();
    const deps = makeDeps();
    (deps.sessions.findWithUserByIdHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      session,
      user,
    });
    const result = await loadCurrentUser(deps);
    expect(result).toBe(user);
    expect(deps.sessions.touch).toHaveBeenCalledTimes(1);
    const expectedNewExpires = new Date(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(deps.sessions.touch).toHaveBeenCalledWith("a".repeat(64), expectedNewExpires, fixedNow);
  });

  it("skips touch when last_used_at is within 5 minutes", async () => {
    cookieMock.get.mockReturnValue({ value: "raw-session" });
    const session = makeSession({
      lastUsedAt: new Date(fixedNow.getTime() - 60 * 1000),
    });
    const user = makeUser();
    const deps = makeDeps();
    (deps.sessions.findWithUserByIdHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      session,
      user,
    });
    const result = await loadCurrentUser(deps);
    expect(result).toBe(user);
    expect(deps.sessions.touch).not.toHaveBeenCalled();
  });
});

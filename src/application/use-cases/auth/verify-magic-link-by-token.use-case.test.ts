import { describe, expect, it, vi } from "vitest";

import {
  AccountDeactivated,
  MagicLinkAlreadyUsed,
  MagicLinkExpired,
  MagicLinkInvalid,
} from "@/domain/errors";

import { verifyMagicLinkByToken } from "./verify-magic-link-by-token.use-case";

type Deps = Parameters<typeof verifyMagicLinkByToken>[0];

const fixedNow = new Date("2030-01-15T12:00:00.000Z");

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    deactivatedAt: Date | null;
    emailVerifiedAt: Date | null;
  }> = {},
) {
  return {
    id: overrides.id ?? "user-123",
    email: overrides.email ?? "u@e.com",
    emailVerifiedAt: overrides.emailVerifiedAt ?? new Date("2030-01-01T00:00:00.000Z"),
    displayName: null,
    role: "user" as const,
    plan: "free" as const,
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationReason: null,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  };
}

function makeToken(
  overrides: Partial<{
    tokenHash: string;
    userId: string | null;
    email: string;
    expiresAt: Date;
    usedAt: Date | null;
    attemptCount: number;
  }> = {},
) {
  return {
    tokenHash: overrides.tokenHash ?? "a".repeat(64),
    code: "482917",
    email: overrides.email ?? "u@e.com",
    userId: overrides.userId === undefined ? "user-123" : overrides.userId,
    expiresAt: overrides.expiresAt ?? new Date(fixedNow.getTime() + 5 * 60 * 1000),
    usedAt: overrides.usedAt ?? null,
    attemptCount: overrides.attemptCount ?? 0,
    createdAt: fixedNow,
  };
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  const users = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(makeUser()),
    create: vi.fn().mockResolvedValue(makeUser()),
    markEmailVerified: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn().mockResolvedValue(undefined),
  };
  const tokens = {
    create: vi.fn(),
    findByTokenHash: vi.fn().mockResolvedValue(makeToken()),
    findActiveByEmail: vi.fn(),
    markUsed: vi.fn().mockResolvedValue(undefined),
    incrementAttempts: vi.fn(),
    deleteExpired: vi.fn(),
  };
  const sessions = {
    findByIdHash: vi.fn(),
    listActiveForUser: vi.fn(),
    create: vi.fn().mockResolvedValue({
      idHash: "session-hash",
      userId: "user-123",
      expiresAt: new Date(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: fixedNow,
      lastUsedAt: fixedNow,
      ip: null,
      userAgent: null,
    }),
    touch: vi.fn(),
    delete: vi.fn(),
    deleteAllForUser: vi.fn(),
  };
  const hasher = { sha256Hex: vi.fn().mockResolvedValue("a".repeat(64)) };
  const random = {
    urlToken: vi.fn().mockReturnValue("session-raw-id"),
    sixDigitCode: vi.fn(),
    bytes: vi.fn(),
  };
  const clock = { now: () => fixedNow };
  return { users, tokens, sessions, hasher, random, clock, ...overrides } as Deps;
}

describe("verifyMagicLinkByToken", () => {
  it("returns MagicLinkInvalid when token hash not found", async () => {
    const deps = makeDeps();
    (deps.tokens.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const result = await verifyMagicLinkByToken(deps, {
      rawToken: "raw",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkInvalid);
    expect(deps.tokens.markUsed).not.toHaveBeenCalled();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("returns MagicLinkAlreadyUsed when token has usedAt set", async () => {
    const deps = makeDeps();
    (deps.tokens.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeToken({ usedAt: new Date(fixedNow.getTime() - 60 * 1000) }),
    );
    const result = await verifyMagicLinkByToken(deps, {
      rawToken: "raw",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkAlreadyUsed);
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("returns MagicLinkExpired when token expiresAt is past", async () => {
    const deps = makeDeps();
    (deps.tokens.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeToken({ expiresAt: new Date(fixedNow.getTime() - 60 * 1000) }),
    );
    const result = await verifyMagicLinkByToken(deps, {
      rawToken: "raw",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkExpired);
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("returns AccountDeactivated when resolved user is deactivated", async () => {
    const deps = makeDeps();
    (deps.users.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeUser({ deactivatedAt: new Date("2030-01-10T00:00:00.000Z") }),
    );
    const result = await verifyMagicLinkByToken(deps, {
      rawToken: "raw",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(AccountDeactivated);
    expect(deps.tokens.markUsed).not.toHaveBeenCalled();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("happy path for new user creates user, marks token used, creates session", async () => {
    const deps = makeDeps();
    (deps.tokens.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeToken({ userId: null, email: "new@user.com" }),
    );
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const created = makeUser({ id: "user-new", email: "new@user.com", emailVerifiedAt: fixedNow });
    (deps.users.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(created);

    const result = await verifyMagicLinkByToken(deps, {
      rawToken: "raw",
      ip: "1.2.3.4",
      userAgent: "ua",
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.create).toHaveBeenCalledWith({
      email: "new@user.com",
      emailVerified: true,
    });
    expect(deps.tokens.markUsed).toHaveBeenCalledTimes(1);
    expect(deps.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-new",
        ip: "1.2.3.4",
        userAgent: "ua",
        expiresAt: new Date(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000),
      }),
    );
    if (result._tag === "ok") {
      expect(result.value.user.id).toBe("user-new");
      expect(result.value.rawSessionId).toBe("session-raw-id");
    }
  });

  it("happy path for existing verified user does not call markEmailVerified", async () => {
    const deps = makeDeps();
    const result = await verifyMagicLinkByToken(deps, {
      rawToken: "raw",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.markEmailVerified).not.toHaveBeenCalled();
    expect(deps.users.create).not.toHaveBeenCalled();
    expect(deps.tokens.markUsed).toHaveBeenCalledTimes(1);
    expect(deps.sessions.create).toHaveBeenCalledTimes(1);
  });
});

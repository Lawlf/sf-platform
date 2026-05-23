import { describe, expect, it, vi } from "vitest";

import {
  AccountDeactivated,
  MagicLinkExpired,
  MagicLinkInvalid,
  TooManyAttempts,
} from "@/domain/errors";
import { InvalidEmailError } from "@/domain/value-objects/email.vo";

import { verifyMagicLinkByCode } from "./verify-magic-link-by-code.use-case";

type Deps = Parameters<typeof verifyMagicLinkByCode>[0];

const fixedNow = new Date("2030-01-15T12:00:00.000Z");

const CORRECT_CODE = "482917";
const CORRECT_CODE_HASH = "code-hash-for-482917";

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
    isPro: false,
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  };
}

function makeToken(
  overrides: Partial<{
    tokenHash: string;
    code: string;
    userId: string | null;
    email: string;
    expiresAt: Date;
    usedAt: Date | null;
    attemptCount: number;
  }> = {},
) {
  return {
    tokenHash: overrides.tokenHash ?? "a".repeat(64),
    code: overrides.code ?? CORRECT_CODE_HASH,
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
    deactivate: vi.fn(),
    update: vi.fn(),
    findAllPro: vi.fn().mockResolvedValue([]),
  };
  const tokens = {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    findActiveByEmail: vi.fn().mockResolvedValue(makeToken()),
    markUsed: vi.fn().mockResolvedValue(undefined),
    incrementAttempts: vi.fn().mockResolvedValue(1),
    deleteExpired: vi.fn(),
  };
  const sessions = {
    findByIdHash: vi.fn(),
    findWithUserByIdHash: vi.fn(),
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
  const hasher = {
    sha256Hex: vi.fn().mockImplementation(async (s: string) =>
      s === CORRECT_CODE ? CORRECT_CODE_HASH : "session-hash",
    ),
  };
  const random = {
    urlToken: vi.fn().mockReturnValue("session-raw-id"),
    sixDigitCode: vi.fn(),
    bytes: vi.fn(),
  };
  const clock = { now: () => fixedNow };
  return { users, tokens, sessions, hasher, random, clock, ...overrides } as Deps;
}

describe("verifyMagicLinkByCode", () => {
  it("returns InvalidEmailError on bad email without touching other deps", async () => {
    const deps = makeDeps();
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "not-an-email",
      code: CORRECT_CODE,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(InvalidEmailError);
    expect(deps.tokens.findActiveByEmail).not.toHaveBeenCalled();
  });

  it("returns MagicLinkInvalid when no active token for email", async () => {
    const deps = makeDeps();
    (deps.tokens.findActiveByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: CORRECT_CODE,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkInvalid);
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("returns TooManyAttempts and invalidates token when attemptCount already at limit", async () => {
    const deps = makeDeps();
    (deps.tokens.findActiveByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeToken({ attemptCount: 5 }),
    );
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: CORRECT_CODE,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(TooManyAttempts);
    expect(deps.tokens.markUsed).toHaveBeenCalledTimes(1);
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("returns MagicLinkExpired when token expiresAt is past", async () => {
    const deps = makeDeps();
    (deps.tokens.findActiveByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeToken({ expiresAt: new Date(fixedNow.getTime() - 60 * 1000) }),
    );
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: CORRECT_CODE,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkExpired);
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("on wrong code below limit returns MagicLinkInvalid and increments attempts", async () => {
    const deps = makeDeps();
    (deps.tokens.incrementAttempts as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2);
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: "000000",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkInvalid);
    expect(deps.tokens.incrementAttempts).toHaveBeenCalledTimes(1);
    expect(deps.tokens.markUsed).not.toHaveBeenCalled();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("on wrong code pushing over the limit returns TooManyAttempts and marks token used", async () => {
    const deps = makeDeps();
    (deps.tokens.findActiveByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeToken({ attemptCount: 4 }),
    );
    (deps.tokens.incrementAttempts as ReturnType<typeof vi.fn>).mockResolvedValueOnce(5);
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: "000000",
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(TooManyAttempts);
    expect(deps.tokens.incrementAttempts).toHaveBeenCalledTimes(1);
    expect(deps.tokens.markUsed).toHaveBeenCalledTimes(1);
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("happy path: matching code marks token used, creates session, returns user and raw session id", async () => {
    const deps = makeDeps();
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: CORRECT_CODE,
      ip: "1.2.3.4",
      userAgent: "ua",
    });
    expect(result._tag).toBe("ok");
    expect(deps.tokens.markUsed).toHaveBeenCalledTimes(1);
    expect(deps.tokens.incrementAttempts).toHaveBeenCalledTimes(1);
    expect(deps.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        ip: "1.2.3.4",
        userAgent: "ua",
        expiresAt: new Date(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000),
      }),
    );
    if (result._tag === "ok") {
      expect(result.value.rawSessionId).toBe("session-raw-id");
      expect(result.value.user.id).toBe("user-123");
    }
  });

  it("returns AccountDeactivated when the resolved user is deactivated", async () => {
    const deps = makeDeps();
    (deps.users.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeUser({ deactivatedAt: new Date("2030-01-10T00:00:00.000Z") }),
    );
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: CORRECT_CODE,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(AccountDeactivated);
    expect(deps.tokens.markUsed).not.toHaveBeenCalled();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("race-guard: token without userId but existing user by email rejects (no auto-create)", async () => {
    const deps = makeDeps();
    (deps.tokens.findActiveByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeToken({ userId: null }),
    );
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeUser());
    const result = await verifyMagicLinkByCode(deps, {
      emailRaw: "u@e.com",
      code: CORRECT_CODE,
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(MagicLinkInvalid);
    expect(deps.tokens.markUsed).toHaveBeenCalledTimes(1);
    expect(deps.users.create).not.toHaveBeenCalled();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });
});

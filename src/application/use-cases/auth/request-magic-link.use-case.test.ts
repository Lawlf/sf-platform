import { describe, expect, it, vi } from "vitest";

import { AccountDeactivated, RateLimited } from "@/domain/errors";
import { InvalidEmailError } from "@/domain/value-objects/email.vo";

import { requestMagicLink } from "./request-magic-link.use-case";

type Deps = Parameters<typeof requestMagicLink>[0];

const fixedNow = new Date("2030-01-15T12:00:00.000Z");

function makeUser(
  overrides: Partial<{ id: string; email: string; deactivatedAt: Date | null }> = {},
) {
  return {
    id: overrides.id ?? "user-123",
    email: overrides.email ?? "u@e.com",
    emailVerifiedAt: new Date("2030-01-01T00:00:00.000Z"),
    displayName: null,
    role: "user" as const,
    plan: "free" as const,
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationReason: null,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  };
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  const users = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    deactivate: vi.fn(),
  };
  const tokens = {
    create: vi.fn().mockResolvedValue({
      tokenHash: "a".repeat(64),
      code: "482917",
      email: "u@e.com",
      userId: null,
      expiresAt: new Date(fixedNow.getTime() + 15 * 60 * 1000),
      usedAt: null,
      attemptCount: 0,
      createdAt: fixedNow,
    }),
    findByTokenHash: vi.fn(),
    findActiveByEmail: vi.fn(),
    markUsed: vi.fn(),
    incrementAttempts: vi.fn(),
    deleteExpired: vi.fn(),
  };
  const email = { send: vi.fn().mockResolvedValue(undefined) };
  const hasher = { sha256Hex: vi.fn().mockResolvedValue("a".repeat(64)) };
  const random = {
    urlToken: vi.fn().mockReturnValue("rawToken"),
    sixDigitCode: vi.fn().mockReturnValue("482917"),
    bytes: vi.fn(),
  };
  const rateLimit = {
    check: vi.fn().mockResolvedValue({ ok: true, remaining: 5, resetAt: fixedNow }),
  };
  const clock = { now: () => fixedNow };
  return {
    users,
    tokens,
    email,
    hasher,
    random,
    rateLimit,
    clock,
    appUrl: "http://localhost:3000",
    ...overrides,
  } as Deps;
}

describe("requestMagicLink", () => {
  it("happy path with no existing user creates token with userId null and sends email", async () => {
    const deps = makeDeps();
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("ok");
    expect(deps.tokens.create).toHaveBeenCalledTimes(1);
    expect(deps.tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "u@e.com",
        userId: null,
        tokenHash: "a".repeat(64),
        code: "482917",
        expiresAt: new Date(fixedNow.getTime() + 15 * 60 * 1000),
      }),
    );
    expect(deps.email.send).toHaveBeenCalledTimes(1);
    expect(deps.email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "u@e.com",
        subject: expect.any(String),
        html: expect.any(String),
        purpose: "auth",
      }),
    );
  });

  it("happy path with existing user creates token with that user id", async () => {
    const user = makeUser({ id: "user-existing" });
    const deps = makeDeps();
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(user);
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("ok");
    expect(deps.tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-existing" }),
    );
    expect(deps.email.send).toHaveBeenCalledTimes(1);
  });

  it("returns AccountDeactivated when user is deactivated, no token created, no email sent", async () => {
    const user = makeUser({ deactivatedAt: new Date("2030-01-10T00:00:00.000Z") });
    const deps = makeDeps();
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(user);
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("err");
    if (result._tag === "err") {
      expect(result.error).toBeInstanceOf(AccountDeactivated);
    }
    expect(deps.tokens.create).not.toHaveBeenCalled();
    expect(deps.email.send).not.toHaveBeenCalled();
  });

  it("returns RateLimited when email rate limiter rejects and does not create token", async () => {
    const deps = makeDeps();
    (deps.rateLimit.check as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      remaining: 0,
      resetAt: fixedNow,
    });
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("err");
    if (result._tag === "err") {
      expect(result.error).toBeInstanceOf(RateLimited);
    }
    expect(deps.tokens.create).not.toHaveBeenCalled();
    expect(deps.email.send).not.toHaveBeenCalled();
  });

  it("returns InvalidEmailError on bad input without touching other deps", async () => {
    const deps = makeDeps();
    const result = await requestMagicLink(deps, { emailRaw: "not-an-email", ipHash: "ip-hash" });
    expect(result._tag).toBe("err");
    if (result._tag === "err") {
      expect(result.error).toBeInstanceOf(InvalidEmailError);
    }
    expect(deps.rateLimit.check).not.toHaveBeenCalled();
    expect(deps.users.findByEmail).not.toHaveBeenCalled();
    expect(deps.tokens.create).not.toHaveBeenCalled();
    expect(deps.email.send).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";

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
    isPro: false,
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
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
    delete: vi.fn(),
    update: vi.fn(),
    findAllPro: vi.fn().mockResolvedValue([]),
  };
  const tokens = {
    create: vi.fn().mockResolvedValue({
      tokenHash: "a".repeat(64),
      code: "h".repeat(64),
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
    hasher,
    random,
    rateLimit,
    clock,
    ...overrides,
  } as Deps;
}

describe("requestMagicLink", () => {
  it("happy path with no existing user creates token with userId null and dispatched=true", async () => {
    const deps = makeDeps();
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("ok");
    expect(deps.tokens.create).toHaveBeenCalledTimes(1);
    expect(deps.tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "u@e.com",
        userId: null,
        tokenHash: "a".repeat(64),
        expiresAt: new Date(fixedNow.getTime() + 15 * 60 * 1000),
      }),
    );
    if (result._tag === "ok") {
      expect(result.value.dispatched).toBe(true);
      expect(result.value.rawToken).toBe("rawToken");
      expect(result.value.code).toBe("482917");
      expect(result.value.email).toBe("u@e.com");
    }
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
  });

  it("silently suppresses dispatch when user is deactivated", async () => {
    const user = makeUser({ deactivatedAt: new Date("2030-01-10T00:00:00.000Z") });
    const deps = makeDeps();
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(user);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("ok");
    if (result._tag === "ok") expect(result.value.dispatched).toBe(false);
    expect(deps.tokens.create).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("silently suppresses dispatch when email bucket is empty", async () => {
    const deps = makeDeps();
    (deps.rateLimit.check as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      remaining: 0,
      resetAt: fixedNow,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("ok");
    if (result._tag === "ok") expect(result.value.dispatched).toBe(false);
    expect(deps.tokens.create).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("silently suppresses dispatch when ip bucket is empty", async () => {
    const deps = makeDeps();
    const checkMock = deps.rateLimit.check as ReturnType<typeof vi.fn>;
    checkMock
      .mockResolvedValueOnce({ ok: true, remaining: 5, resetAt: fixedNow })
      .mockResolvedValueOnce({ ok: false, remaining: 0, resetAt: fixedNow });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await requestMagicLink(deps, { emailRaw: "u@e.com", ipHash: "ip-hash" });
    expect(result._tag).toBe("ok");
    if (result._tag === "ok") expect(result.value.dispatched).toBe(false);
    expect(deps.tokens.create).not.toHaveBeenCalled();
    warn.mockRestore();
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
  });
});

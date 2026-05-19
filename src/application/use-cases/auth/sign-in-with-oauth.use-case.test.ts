import { describe, expect, it, vi } from "vitest";

import { AccountDeactivated, OauthAccountLinkRequiresVerification } from "@/domain/errors";
import type { OauthProfile } from "@/domain/ports/services/oauth-provider.service";

import { signInWithOauth } from "./sign-in-with-oauth.use-case";

type Deps = Parameters<typeof signInWithOauth>[0];

const fixedNow = new Date("2030-01-15T12:00:00.000Z");

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    deactivatedAt: Date | null;
    emailVerifiedAt: Date | null;
    displayName: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? "user-123",
    email: overrides.email ?? "u@e.com",
    emailVerifiedAt:
      overrides.emailVerifiedAt === undefined
        ? new Date("2030-01-01T00:00:00.000Z")
        : overrides.emailVerifiedAt,
    displayName: overrides.displayName ?? null,
    role: "user" as const,
    plan: "free" as const,
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationReason: null,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  };
}

function makeOauthAccount(
  overrides: Partial<{
    id: string;
    userId: string;
    provider: "google" | "apple";
    providerUserId: string;
  }> = {},
) {
  return {
    id: overrides.id ?? "oacc-1",
    userId: overrides.userId ?? "user-123",
    provider: overrides.provider ?? ("google" as const),
    providerUserId: overrides.providerUserId ?? "google-12345",
    createdAt: fixedNow,
  };
}

function makeProfile(overrides: Partial<OauthProfile> = {}): OauthProfile {
  return {
    provider: overrides.provider ?? "google",
    providerUserId: overrides.providerUserId ?? "google-12345",
    email: overrides.email ?? "u@e.com",
    emailVerified: overrides.emailVerified ?? true,
    displayName: overrides.displayName ?? "User Example",
  };
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  const users = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(makeUser()),
    create: vi.fn().mockResolvedValue(makeUser()),
    markEmailVerified: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn(),
  };
  const oauthAccounts = {
    findByProviderAndId: vi.fn().mockResolvedValue(null),
    listForUser: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(makeOauthAccount()),
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
  const hasher = { sha256Hex: vi.fn().mockResolvedValue("session-hash") };
  const random = {
    urlToken: vi.fn().mockReturnValue("session-raw-id"),
    sixDigitCode: vi.fn(),
    bytes: vi.fn(),
  };
  const clock = { now: () => fixedNow };
  return { users, oauthAccounts, sessions, hasher, random, clock, ...overrides } as Deps;
}

describe("signInWithOauth", () => {
  it("existing oauth account + active user: creates session, no new user or oauth account", async () => {
    const deps = makeDeps();
    (deps.oauthAccounts.findByProviderAndId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeOauthAccount(),
    );
    const result = await signInWithOauth(deps, {
      profile: makeProfile(),
      ip: "1.2.3.4",
      userAgent: "ua",
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.create).not.toHaveBeenCalled();
    expect(deps.oauthAccounts.create).not.toHaveBeenCalled();
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

  it("existing oauth account + deactivated user: returns AccountDeactivated and no session", async () => {
    const deps = makeDeps();
    (deps.oauthAccounts.findByProviderAndId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeOauthAccount(),
    );
    (deps.users.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeUser({ deactivatedAt: new Date("2030-01-10T00:00:00.000Z") }),
    );
    const result = await signInWithOauth(deps, {
      profile: makeProfile(),
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") expect(result.error).toBeInstanceOf(AccountDeactivated);
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("no oauth account, existing user by email: returns OauthAccountLinkRequiresVerification and creates nothing", async () => {
    const deps = makeDeps();
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeUser());
    const result = await signInWithOauth(deps, {
      profile: makeProfile(),
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") {
      expect(result.error).toBeInstanceOf(OauthAccountLinkRequiresVerification);
    }
    expect(deps.users.create).not.toHaveBeenCalled();
    expect(deps.oauthAccounts.create).not.toHaveBeenCalled();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it("no oauth account and no user by email: creates user, oauth_account, and session", async () => {
    const deps = makeDeps();
    const createdUser = makeUser({
      id: "user-new",
      emailVerifiedAt: new Date("2030-01-15T12:00:00.000Z"),
    });
    (deps.users.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdUser);
    const result = await signInWithOauth(deps, {
      profile: makeProfile({ email: "new@e.com" }),
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.create).toHaveBeenCalledWith({
      email: "new@e.com",
      emailVerified: true,
      displayName: "User Example",
    });
    expect(deps.oauthAccounts.create).toHaveBeenCalledWith({
      userId: "user-new",
      provider: "google",
      providerUserId: "google-12345",
    });
    expect(deps.sessions.create).toHaveBeenCalledTimes(1);
  });

  it("profile emailVerified=true and user not yet verified: markEmailVerified is called", async () => {
    const deps = makeDeps();
    (deps.oauthAccounts.findByProviderAndId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeOauthAccount(),
    );
    (deps.users.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeUser({ emailVerifiedAt: null }),
    );
    const result = await signInWithOauth(deps, {
      profile: makeProfile({ emailVerified: true }),
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.markEmailVerified).toHaveBeenCalledWith("user-123");
  });

  it("data inconsistency (oauth account references missing user): treats as no-account, creates new user + oauth_account", async () => {
    const deps = makeDeps();
    (deps.oauthAccounts.findByProviderAndId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeOauthAccount(),
    );
    (deps.users.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const createdUser = makeUser({ id: "user-recreated" });
    (deps.users.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdUser);
    const result = await signInWithOauth(deps, {
      profile: makeProfile(),
      ip: null,
      userAgent: null,
    });
    expect(result._tag).toBe("ok");
    expect(deps.users.create).toHaveBeenCalledTimes(1);
    expect(deps.oauthAccounts.create).toHaveBeenCalledWith({
      userId: "user-recreated",
      provider: "google",
      providerUserId: "google-12345",
    });
    expect(deps.sessions.create).toHaveBeenCalledTimes(1);
  });
});

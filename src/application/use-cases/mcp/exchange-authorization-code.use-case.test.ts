import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { exchangeAuthorizationCode } from "./exchange-authorization-code.use-case";

const now = new Date("2026-06-03T12:00:00Z");

function deps(consumed = false, expired = false, markConsumedResult = true) {
  return {
    codes: {
      findByHash: async () => ({
        codeHash: "hash:raw-code",
        clientId: "cli",
        userId: "u1",
        scopes: ["assets:read"],
        codeChallenge: "chal",
        redirectUri: "https://claude.ai/cb",
        expiresAt: expired ? new Date("2026-06-03T11:00:00Z") : new Date("2026-06-03T12:00:30Z"),
        consumedAt: consumed ? now : null,
      }),
      markConsumed: async () => markConsumedResult,
    },
    connections: {
      create: async () => ({
        id: "c1",
        userId: "u1",
        clientId: "cli",
        clientName: "Cliente MCP",
        status: "active",
        createdAt: now,
        lastUsedAt: now,
        revokedAt: null,
      }),
    },
    clients: {
      findByClientId: async () => ({
        id: "row",
        clientId: "cli",
        clientSecretHash: null,
        redirectUris: ["https://claude.ai/cb"],
        name: "Claude",
        createdAt: now,
      }),
    },
    tokens: { createAccessToken: async () => {}, createRefreshToken: async () => {} },
    hasher: { sha256Hex: async (v: string) => `hash:${v}` },
    issueToken: async () => ({ raw: "tok", hash: "hash:tok" }),
    verifyPkce: () => true,
    clock: { now: () => now },
  } as unknown as Parameters<typeof exchangeAuthorizationCode>[0];
}

describe("exchangeAuthorizationCode", () => {
  it("troca code válido por tokens", async () => {
    const r = await exchangeAuthorizationCode(deps(), {
      code: "raw-code",
      clientId: "cli",
      redirectUri: "https://claude.ai/cb",
      codeVerifier: "verifier",
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.accessToken).toBe("tok");
      expect(r.value.scopes).toContain("assets:read");
    }
  });

  it("rejeita quando markConsumed perde a corrida concorrente", async () => {
    const r = await exchangeAuthorizationCode(deps(false, false, false), {
      code: "raw-code",
      clientId: "cli",
      redirectUri: "https://claude.ai/cb",
      codeVerifier: "verifier",
    });
    expect(isErr(r)).toBe(true);
  });

  it("rejeita code já consumido", async () => {
    const r = await exchangeAuthorizationCode(deps(true), {
      code: "raw-code",
      clientId: "cli",
      redirectUri: "https://claude.ai/cb",
      codeVerifier: "verifier",
    });
    expect(isErr(r)).toBe(true);
  });

  it("rejeita code expirado", async () => {
    const r = await exchangeAuthorizationCode(deps(false, true), {
      code: "raw-code",
      clientId: "cli",
      redirectUri: "https://claude.ai/cb",
      codeVerifier: "verifier",
    });
    expect(isErr(r)).toBe(true);
  });

  it("rejeita clientId divergente", async () => {
    const r = await exchangeAuthorizationCode(deps(), {
      code: "raw-code",
      clientId: "other",
      redirectUri: "https://claude.ai/cb",
      codeVerifier: "verifier",
    });
    expect(isErr(r)).toBe(true);
  });

  it("rejeita redirectUri divergente", async () => {
    const r = await exchangeAuthorizationCode(deps(), {
      code: "raw-code",
      clientId: "cli",
      redirectUri: "https://evil.example/cb",
      codeVerifier: "verifier",
    });
    expect(isErr(r)).toBe(true);
  });

  it("rejeita PKCE inválido", async () => {
    const d = deps();
    (d as unknown as { verifyPkce: () => boolean }).verifyPkce = () => false;
    const r = await exchangeAuthorizationCode(d, {
      code: "raw-code",
      clientId: "cli",
      redirectUri: "https://claude.ai/cb",
      codeVerifier: "wrong",
    });
    expect(isErr(r)).toBe(true);
  });
});

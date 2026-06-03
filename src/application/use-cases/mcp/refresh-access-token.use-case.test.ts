import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { refreshAccessToken } from "./refresh-access-token.use-case";

const now = new Date("2026-06-03T12:00:00Z");

function deps(opts: { found?: boolean; expired?: boolean; revoked?: boolean } = {}) {
  const { found = true, expired = false, revoked = false } = opts;
  return {
    tokens: {
      findRefreshTokenByHash: async () =>
        found
          ? {
              tokenHash: "hash:rt",
              connectionId: "c1",
              expiresAt: expired ? new Date("2026-06-01T00:00:00Z") : new Date("2026-07-01T00:00:00Z"),
            }
          : null,
      rotateRefreshToken: async () => {},
      createAccessToken: async () => {},
    },
    connections: {
      findById: async () => ({
        id: "c1",
        userId: "u1",
        clientId: "cli",
        clientName: "Claude",
        status: revoked ? "revoked" : "active",
        createdAt: now,
        lastUsedAt: now,
        revokedAt: revoked ? now : null,
      }),
    },
    hasher: { sha256Hex: async (v: string) => `hash:${v}` },
    issueToken: async () => ({ raw: "new-tok", hash: "hash:new-tok" }),
    clock: { now: () => now },
  } as unknown as Parameters<typeof refreshAccessToken>[0];
}

describe("refreshAccessToken", () => {
  it("rotaciona e emite novo access token", async () => {
    const r = await refreshAccessToken(deps(), { refreshToken: "rt" });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.accessToken).toBe("new-tok");
  });
  it("rejeita refresh inexistente", async () => {
    expect(isErr(await refreshAccessToken(deps({ found: false }), { refreshToken: "rt" }))).toBe(true);
  });
  it("rejeita refresh expirado", async () => {
    expect(isErr(await refreshAccessToken(deps({ expired: true }), { refreshToken: "rt" }))).toBe(true);
  });
  it("rejeita conexão revogada", async () => {
    expect(isErr(await refreshAccessToken(deps({ revoked: true }), { refreshToken: "rt" }))).toBe(true);
  });
});

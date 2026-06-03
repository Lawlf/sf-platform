import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { resolveMcpContext } from "./resolve-mcp-context.use-case";

const now = new Date("2026-06-03T12:00:00Z");

function deps(overrides: Partial<Parameters<typeof resolveMcpContext>[0]> = {}) {
  return {
    hasher: { sha256Hex: async (v: string) => `hash:${v}` },
    tokens: {
      findAccessTokenByHash: async (h: string) =>
        h === "hash:good"
          ? { tokenHash: h, connectionId: "c1", expiresAt: new Date("2026-06-03T12:30:00Z") }
          : null,
    },
    connections: {
      findById: async (id: string) =>
        id === "c1"
          ? {
              id: "c1",
              userId: "u1",
              clientId: "cli",
              clientName: "Claude",
              status: "active",
              createdAt: now,
              lastUsedAt: now,
              revokedAt: null,
            }
          : null,
      listScopes: async () => ["assets:read"],
      touch: async () => {},
    },
    users: { findById: async (id: string) => (id === "u1" ? { id: "u1", isPro: false } : null) },
    clock: { now: () => now },
    ...overrides,
  } as unknown as Parameters<typeof resolveMcpContext>[0];
}

describe("resolveMcpContext", () => {
  it("resolve contexto com escopos", async () => {
    const r = await resolveMcpContext(deps(), { rawToken: "good" });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.userId).toBe("u1");
      expect(r.value.scopes).toEqual(["assets:read"]);
      expect(r.value.isPro).toBe(false);
    }
  });

  it("nega token inexistente", async () => {
    const r = await resolveMcpContext(deps(), { rawToken: "bad" });
    expect(isErr(r)).toBe(true);
  });

  it("nega token expirado", async () => {
    const d = deps({
      tokens: {
        findAccessTokenByHash: async () => ({
          tokenHash: "hash:good",
          connectionId: "c1",
          expiresAt: new Date("2026-06-03T11:00:00Z"),
        }),
      } as never,
    });
    const r = await resolveMcpContext(d, { rawToken: "good" });
    expect(isErr(r)).toBe(true);
  });

  it("nega conexão revogada", async () => {
    const d = deps({
      connections: {
        findById: async () => ({
          id: "c1",
          userId: "u1",
          clientId: "cli",
          clientName: "Claude",
          status: "revoked",
          createdAt: now,
          lastUsedAt: now,
          revokedAt: now,
        }),
        listScopes: async () => [],
        touch: async () => {},
      } as never,
    });
    const r = await resolveMcpContext(d, { rawToken: "good" });
    expect(isErr(r)).toBe(true);
  });
});

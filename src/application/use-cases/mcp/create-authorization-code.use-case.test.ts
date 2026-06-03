import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { createAuthorizationCode } from "./create-authorization-code.use-case";

const now = new Date("2026-06-03T12:00:00Z");

function deps() {
  const saved: unknown[] = [];
  return {
    clients: {
      findByClientId: async (id: string) =>
        id === "cli"
          ? {
              id: "row",
              clientId: "cli",
              clientSecretHash: null,
              redirectUris: ["https://claude.ai/cb"],
              name: "Claude",
              createdAt: now,
            }
          : null,
    },
    codes: { create: async (c: unknown) => void saved.push(c) },
    hasher: { sha256Hex: async (v: string) => `hash:${v}` },
    random: { urlToken: () => "raw-code" },
    clock: { now: () => now },
    saved,
  };
}

describe("createAuthorizationCode", () => {
  it("emite code para client + redirect válidos", async () => {
    const d = deps();
    const r = await createAuthorizationCode(d, {
      clientId: "cli",
      userId: "u1",
      redirectUri: "https://claude.ai/cb",
      scopes: ["assets:read"],
      codeChallenge: "chal",
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.code).toBe("raw-code");
  });

  it("rejeita redirect uri não registrado", async () => {
    const d = deps();
    const r = await createAuthorizationCode(d, {
      clientId: "cli",
      userId: "u1",
      redirectUri: "https://evil.com/cb",
      scopes: ["assets:read"],
      codeChallenge: "chal",
    });
    expect(isErr(r)).toBe(true);
  });

  it("rejeita client desconhecido", async () => {
    const d = deps();
    const r = await createAuthorizationCode(d, {
      clientId: "nope",
      userId: "u1",
      redirectUri: "https://claude.ai/cb",
      scopes: ["assets:read"],
      codeChallenge: "chal",
    });
    expect(isErr(r)).toBe(true);
  });
});

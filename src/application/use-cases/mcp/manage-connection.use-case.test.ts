import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { revokeConnection, setConnectionScope } from "./manage-connection.use-case";

const now = new Date("2026-06-03T12:00:00Z");

function deps(ownerId = "u1") {
  const calls: string[] = [];
  return {
    connections: {
      findById: async () => ({
        id: "c1",
        userId: ownerId,
        clientId: "cli",
        clientName: "Claude",
        status: "active",
        createdAt: now,
        lastUsedAt: now,
        revokedAt: null,
      }),
      revoke: async () => void calls.push("revoke"),
      addScope: async () => void calls.push("add"),
      removeScope: async () => void calls.push("remove"),
    },
    tokens: { deleteForConnection: async () => void calls.push("delTokens") },
    clock: { now: () => now },
    calls,
  } as unknown as Parameters<typeof revokeConnection>[0] & { calls: string[] };
}

describe("manageConnection", () => {
  it("revoga conexão do próprio usuário e apaga tokens", async () => {
    const d = deps();
    const r = await revokeConnection(d, { userId: "u1", connectionId: "c1" });
    expect(isOk(r)).toBe(true);
    expect(d.calls).toContain("revoke");
    expect(d.calls).toContain("delTokens");
  });

  it("nega revogar conexão de outro usuário", async () => {
    const d = deps("outro");
    const r = await revokeConnection(d, { userId: "u1", connectionId: "c1" });
    expect(isErr(r)).toBe(true);
  });

  it("adiciona escopo (grant)", async () => {
    const d = deps();
    const r = await setConnectionScope(d, {
      userId: "u1",
      connectionId: "c1",
      scope: "assets:write",
      grant: true,
    });
    expect(isOk(r)).toBe(true);
    expect(d.calls).toContain("add");
  });

  it("nega alterar escopo de conexão de outro usuário", async () => {
    const d = deps("outro");
    const r = await setConnectionScope(d, {
      userId: "u1",
      connectionId: "c1",
      scope: "assets:write",
      grant: true,
    });
    expect(isErr(r)).toBe(true);
  });

  it("remove escopo (revoke)", async () => {
    const d = deps();
    const r = await setConnectionScope(d, {
      userId: "u1",
      connectionId: "c1",
      scope: "assets:write",
      grant: false,
    });
    expect(isOk(r)).toBe(true);
    expect(d.calls).toContain("remove");
  });
});

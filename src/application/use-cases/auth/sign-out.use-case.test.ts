import { describe, expect, it, vi } from "vitest";

import { signOut } from "./sign-out.use-case";

type Deps = Parameters<typeof signOut>[0];

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  const sessions = {
    findByIdHash: vi.fn(),
    listActiveForUser: vi.fn(),
    create: vi.fn(),
    touch: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteAllForUser: vi.fn(),
  };
  const hasher = {
    sha256Hex: vi.fn().mockResolvedValue("a".repeat(64)),
  };
  return { sessions, hasher, ...overrides } as Deps;
}

describe("signOut", () => {
  it("hashes the raw session id and calls sessions.delete with the hash", async () => {
    const deps = makeDeps();
    await signOut(deps, "raw-session-id");
    expect(deps.hasher.sha256Hex).toHaveBeenCalledWith("raw-session-id");
    expect(deps.sessions.delete).toHaveBeenCalledTimes(1);
    expect(deps.sessions.delete).toHaveBeenCalledWith("a".repeat(64));
  });
});

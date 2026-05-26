import { describe, expect, it, vi } from "vitest";

import type { SessionEntity } from "@/domain/entities/session.entity";
import { Forbidden, SessionNotFound } from "@/domain/errors/auth-errors";

import { revokeSession } from "./revoke-session.use-case";

type Deps = Parameters<typeof revokeSession>[0];

function makeSession(overrides: Partial<SessionEntity> = {}): SessionEntity {
  const base: SessionEntity = {
    idHash: "a".repeat(64),
    userId: "user-1",
    expiresAt: new Date("2030-02-01T00:00:00.000Z"),
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    lastUsedAt: new Date("2030-01-02T00:00:00.000Z"),
    ip: null,
    userAgent: null,
  };
  return { ...base, ...overrides };
}

function makeDeps(rows: SessionEntity[]): Deps {
  const sessions = {
    findByIdHash: vi.fn(),
    findWithUserByIdHash: vi.fn(),
    listActiveForUser: vi.fn().mockResolvedValue(rows),
    create: vi.fn(),
    touch: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteAllForUser: vi.fn(),
  };
  return { sessions } as Deps;
}

describe("revokeSession", () => {
  it("returns SessionNotFound when no session matches the public id", async () => {
    const deps = makeDeps([makeSession({ idHash: "a".repeat(64) })]);
    const result = await revokeSession(deps, {
      userId: "user-1",
      publicSessionId: "zzzzzzzzzzzz",
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") {
      expect(result.error).toBeInstanceOf(SessionNotFound);
    }
    expect(deps.sessions.delete).not.toHaveBeenCalled();
  });

  it("deletes the matched session and returns ok on the happy path", async () => {
    const target = makeSession({ idHash: "abcdef".repeat(10) + "abcd" });
    const deps = makeDeps([target, makeSession({ idHash: "ffffff".repeat(10) + "ffff" })]);
    const result = await revokeSession(deps, {
      userId: "user-1",
      publicSessionId: target.idHash.slice(0, 12),
    });
    expect(result._tag).toBe("ok");
    expect(deps.sessions.delete).toHaveBeenCalledTimes(1);
    expect(deps.sessions.delete).toHaveBeenCalledWith(target.idHash);
  });

  it("returns Forbidden when the matched session belongs to another user", async () => {
    const target = makeSession({ idHash: "c".repeat(64), userId: "user-2" });
    const deps = makeDeps([target]);
    const result = await revokeSession(deps, {
      userId: "user-1",
      publicSessionId: target.idHash.slice(0, 12),
    });
    expect(result._tag).toBe("err");
    if (result._tag === "err") {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(deps.sessions.delete).not.toHaveBeenCalled();
  });
});

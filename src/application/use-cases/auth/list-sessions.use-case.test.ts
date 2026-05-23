import { describe, expect, it, vi } from "vitest";

import type { SessionEntity } from "@/domain/entities/session.entity";

import { listSessions } from "./list-sessions.use-case";

type Deps = Parameters<typeof listSessions>[0];

function makeDeps(rows: SessionEntity[]): Deps {
  const sessions = {
    findByIdHash: vi.fn(),
    findWithUserByIdHash: vi.fn(),
    listActiveForUser: vi.fn().mockResolvedValue(rows),
    create: vi.fn(),
    touch: vi.fn(),
    delete: vi.fn(),
    deleteAllForUser: vi.fn(),
  };
  return { sessions } as Deps;
}

describe("listSessions", () => {
  it("returns an empty array when the user has no active sessions", async () => {
    const deps = makeDeps([]);
    const result = await listSessions(deps, "user-1");
    expect(result).toEqual([]);
    expect(deps.sessions.listActiveForUser).toHaveBeenCalledWith("user-1");
  });

  it("maps sessions to DTOs that expose only the first 12 chars of the idHash", async () => {
    const idHashA = "a".repeat(64);
    const idHashB = "b".repeat(64);
    const createdAt = new Date("2030-01-01T00:00:00.000Z");
    const lastUsedAt = new Date("2030-01-02T00:00:00.000Z");
    const expiresAt = new Date("2030-02-01T00:00:00.000Z");
    const rows: SessionEntity[] = [
      {
        idHash: idHashA,
        userId: "user-1",
        expiresAt,
        createdAt,
        lastUsedAt,
        ip: "1.2.3.4",
        userAgent: "ua-a",
      },
      {
        idHash: idHashB,
        userId: "user-1",
        expiresAt,
        createdAt,
        lastUsedAt,
        ip: null,
        userAgent: null,
      },
    ];
    const deps = makeDeps(rows);
    const result = await listSessions(deps, "user-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "a".repeat(12),
      userId: "user-1",
      expiresAt,
      createdAt,
      lastUsedAt,
      ip: "1.2.3.4",
      userAgent: "ua-a",
    });
    expect(result[1]).toEqual({
      id: "b".repeat(12),
      userId: "user-1",
      expiresAt,
      createdAt,
      lastUsedAt,
      ip: null,
      userAgent: null,
    });
    // No DTO leaks the full hash.
    for (const dto of result) {
      expect(dto).not.toHaveProperty("idHash");
      expect(dto.id.length).toBe(12);
      expect(dto.id).not.toBe(idHashA);
      expect(dto.id).not.toBe(idHashB);
    }
  });
});

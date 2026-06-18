import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdNotMember } from "@/domain/errors/household-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { removeMember } from "./remove-member.use-case";

function makeMember(
  userId: string,
  role: "admin" | "member",
  joinedAt = new Date("2026-01-01"),
): HouseholdMemberEntity {
  return { householdId: "h1", userId, role, joinedAt };
}

function makeRepo(opts: {
  adminMembership: HouseholdMemberEntity | null;
  targetMembership: HouseholdMemberEntity | null;
  members: HouseholdMemberEntity[];
}): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(async () => undefined),
    setRole: vi.fn(async () => undefined),
    listMembers: vi.fn(async () => opts.members),
    findMembership: vi.fn(async (householdId: string, userId: string) => {
      if (userId === opts.adminMembership?.userId) return opts.adminMembership;
      if (userId === opts.targetMembership?.userId) return opts.targetMembership;
      return null;
    }),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(async () => undefined),
    createInvite: vi.fn(),
    findInvite: vi.fn(),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

describe("removeMember", () => {
  it("admin removes a regular member successfully", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const target = makeMember("member1", "member", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: target,
      members: [admin, target],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "member1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "member1");
    expect(repo.setRole).not.toHaveBeenCalled();
    expect(repo.deleteHousehold).not.toHaveBeenCalled();
  });

  it("non-admin cannot remove a member — returns Forbidden", async () => {
    const nonAdmin = makeMember("member1", "member", new Date("2026-01-01"));
    const target = makeMember("member2", "member", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: nonAdmin,
      targetMembership: target,
      members: [nonAdmin, target],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "member1", targetUserId: "member2" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(repo.removeMember).not.toHaveBeenCalled();
  });

  it("non-member cannot remove — returns Forbidden", async () => {
    const target = makeMember("member1", "member", new Date("2026-01-01"));
    const repo = makeRepo({
      adminMembership: null,
      targetMembership: target,
      members: [target],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "outsider", targetUserId: "member1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(repo.removeMember).not.toHaveBeenCalled();
  });

  it("admin cannot remove themselves via this use-case — returns Forbidden", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: admin,
      members: [admin],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "admin1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(repo.removeMember).not.toHaveBeenCalled();
  });

  it("removing target that is not in household — returns HouseholdNotMember", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: null,
      members: [admin],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "nobody" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdNotMember);
    expect(repo.removeMember).not.toHaveBeenCalled();
  });

  it("removing admin when no other admin remains — promotes oldest member", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const remover = makeMember("admin2", "admin", new Date("2026-01-02"));
    const member = makeMember("member1", "member", new Date("2026-01-03"));
    const repo = makeRepo({
      adminMembership: remover,
      targetMembership: admin,
      members: [admin, remover, member],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "admin2", targetUserId: "admin1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "admin1");
    expect(repo.setRole).not.toHaveBeenCalled();
  });

  it("removing last member triggers household dissolution", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const remover = makeMember("admin2", "admin", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: remover,
      targetMembership: admin,
      members: [admin, remover],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "admin2", targetUserId: "admin1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "admin1");
  });

  it("removing last member when only 1 total — dissolves household", async () => {
    const target = makeMember("member1", "member", new Date("2026-01-01"));
    const admin = makeMember("admin1", "admin", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: target,
      members: [admin, target],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "member1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "member1");
    expect(repo.deleteHousehold).not.toHaveBeenCalled();
  });

  it("removing sole non-admin member when admin remains — no dissolve, no promote", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const member = makeMember("member1", "member", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: member,
      members: [admin, member],
    });

    const result = await removeMember(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "member1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "member1");
    expect(repo.setRole).not.toHaveBeenCalled();
    expect(repo.deleteHousehold).not.toHaveBeenCalled();
  });
});

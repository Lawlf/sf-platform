import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdLastAdminError, HouseholdNotMember } from "@/domain/errors/household-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { setMemberRole } from "./set-member-role.use-case";

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
    removeMember: vi.fn(),
    setRole: vi.fn(async () => undefined),
    listMembers: vi.fn(async () => opts.members),
    findMembership: vi.fn(async (householdId: string, userId: string) => {
      if (userId === opts.adminMembership?.userId) return opts.adminMembership;
      if (userId === opts.targetMembership?.userId) return opts.targetMembership;
      return null;
    }),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    createInvite: vi.fn(),
    findInvite: vi.fn(),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

describe("setMemberRole", () => {
  it("admin promotes a member to admin", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const member = makeMember("member1", "member", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: member,
      members: [admin, member],
    });

    const result = await setMemberRole(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "member1", role: "admin" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.setRole).toHaveBeenCalledWith("h1", "member1", "admin");
  });

  it("admin demotes another admin when at least one admin remains", async () => {
    const admin1 = makeMember("admin1", "admin", new Date("2026-01-01"));
    const admin2 = makeMember("admin2", "admin", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: admin1,
      targetMembership: admin2,
      members: [admin1, admin2],
    });

    const result = await setMemberRole(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "admin2", role: "member" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.setRole).toHaveBeenCalledWith("h1", "admin2", "member");
  });

  it("blocks downgrading the last admin — returns HouseholdLastAdminError", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const member = makeMember("member1", "member", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: admin,
      members: [admin, member],
    });

    const result = await setMemberRole(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "admin1", role: "member" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdLastAdminError);
    expect(repo.setRole).not.toHaveBeenCalled();
  });

  it("non-admin cannot set roles — returns Forbidden", async () => {
    const member = makeMember("member1", "member", new Date("2026-01-01"));
    const target = makeMember("member2", "member", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: member,
      targetMembership: target,
      members: [member, target],
    });

    const result = await setMemberRole(
      { households: repo },
      { householdId: "h1", adminUserId: "member1", targetUserId: "member2", role: "admin" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(repo.setRole).not.toHaveBeenCalled();
  });

  it("outsider (non-member) cannot set roles — returns Forbidden", async () => {
    const target = makeMember("member1", "member", new Date("2026-01-01"));
    const repo = makeRepo({
      adminMembership: null,
      targetMembership: target,
      members: [target],
    });

    const result = await setMemberRole(
      { households: repo },
      { householdId: "h1", adminUserId: "outsider", targetUserId: "member1", role: "admin" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(repo.setRole).not.toHaveBeenCalled();
  });

  it("target not in household — returns HouseholdNotMember", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: null,
      members: [admin],
    });

    const result = await setMemberRole(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "nobody", role: "admin" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdNotMember);
    expect(repo.setRole).not.toHaveBeenCalled();
  });

  it("setting same role (member → member) succeeds without admin check", async () => {
    const admin = makeMember("admin1", "admin", new Date("2026-01-01"));
    const member = makeMember("member1", "member", new Date("2026-01-02"));
    const repo = makeRepo({
      adminMembership: admin,
      targetMembership: member,
      members: [admin, member],
    });

    const result = await setMemberRole(
      { households: repo },
      { householdId: "h1", adminUserId: "admin1", targetUserId: "member1", role: "member" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.setRole).toHaveBeenCalledWith("h1", "member1", "member");
  });
});

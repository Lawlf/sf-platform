import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";
import { HouseholdNotMember } from "@/domain/errors/household-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { leaveHousehold } from "./leave-household.use-case";

function makeMember(
  userId: string,
  role: "admin" | "member",
  joinedAt = new Date("2026-01-01"),
): HouseholdMemberEntity {
  return { householdId: "h1", userId, role, joinedAt };
}

function makeRepo(opts: {
  membership: HouseholdMemberEntity | null;
  members: HouseholdMemberEntity[];
}): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(async () => undefined),
    removeSharedProfilesForUser: vi.fn(async () => undefined),
    setRole: vi.fn(async () => undefined),
    listMembers: vi.fn(async () => opts.members),
    findMembership: vi.fn(async () => opts.membership),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(async () => undefined),
    createInvite: vi.fn(),
    findInvite: vi.fn(),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

describe("leaveHousehold", () => {
  it("member leaves while admin remains — removes member, no promote, no dissolve", async () => {
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("member1", "member", new Date("2026-01-02")),
    ];
    const repo = makeRepo({ membership: members[1]!, members });

    const result = await leaveHousehold(
      { households: repo },
      { householdId: "h1", userId: "member1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "member1");
    expect(repo.setRole).not.toHaveBeenCalled();
    expect(repo.deleteHousehold).not.toHaveBeenCalled();
  });

  it("sole admin leaves with remaining members — promotes oldest member", async () => {
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("member2", "member", new Date("2026-01-03")),
      makeMember("member1", "member", new Date("2026-01-02")),
    ];
    const repo = makeRepo({ membership: members[0]!, members });

    const result = await leaveHousehold(
      { households: repo },
      { householdId: "h1", userId: "admin1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "admin1");
    expect(repo.setRole).toHaveBeenCalledWith("h1", "member1", "admin");
    expect(repo.deleteHousehold).not.toHaveBeenCalled();
  });

  it("last member leaves — dissolves household", async () => {
    const members = [makeMember("admin1", "admin", new Date("2026-01-01"))];
    const repo = makeRepo({ membership: members[0]!, members });

    const result = await leaveHousehold(
      { households: repo },
      { householdId: "h1", userId: "admin1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "admin1");
    expect(repo.deleteHousehold).toHaveBeenCalledWith("h1");
    expect(repo.setRole).not.toHaveBeenCalled();
  });

  it("regular member leaves — no promote, no dissolve", async () => {
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("member1", "member", new Date("2026-01-02")),
      makeMember("member2", "member", new Date("2026-01-03")),
    ];
    const repo = makeRepo({ membership: members[2]!, members });

    const result = await leaveHousehold(
      { households: repo },
      { householdId: "h1", userId: "member2" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeMember).toHaveBeenCalledWith("h1", "member2");
    expect(repo.setRole).not.toHaveBeenCalled();
    expect(repo.deleteHousehold).not.toHaveBeenCalled();
  });

  it("non-member cannot leave — returns HouseholdNotMember", async () => {
    const repo = makeRepo({ membership: null, members: [] });

    const result = await leaveHousehold(
      { households: repo },
      { householdId: "h1", userId: "outsider" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdNotMember);
    expect(repo.removeMember).not.toHaveBeenCalled();
  });

  it("leaving member's shared profiles are removed before removeMember", async () => {
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("member1", "member", new Date("2026-01-02")),
    ];
    const repo = makeRepo({ membership: members[1]!, members });

    const callOrder: string[] = [];
    (repo.removeSharedProfilesForUser as ReturnType<typeof vi.fn>).mockImplementation(
      async () => { callOrder.push("removeSharedProfiles"); },
    );
    (repo.removeMember as ReturnType<typeof vi.fn>).mockImplementation(
      async () => { callOrder.push("removeMember"); },
    );

    const result = await leaveHousehold(
      { households: repo },
      { householdId: "h1", userId: "member1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.removeSharedProfilesForUser).toHaveBeenCalledWith("h1", "member1");
    expect(callOrder).toEqual(["removeSharedProfiles", "removeMember"]);
  });
});

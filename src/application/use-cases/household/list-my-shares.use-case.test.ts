import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity, HouseholdMemberProfileEntity } from "@/domain/entities/household.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { listMyShares } from "./list-my-shares.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeMembership(userId = "u1"): HouseholdMemberEntity {
  return { householdId: "h1", userId, role: "member", joinedAt: NOW };
}

function makeShare(profileId: string, userId = "u1"): HouseholdMemberProfileEntity {
  return {
    householdId: "h1",
    userId,
    profileId,
    shareLevel: "aggregate",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeHouseholdsRepo(opts: {
  membership: HouseholdMemberEntity | null;
  shares: HouseholdMemberProfileEntity[];
}): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    setRole: vi.fn(),
    listMembers: vi.fn(),
    findMembership: vi.fn(async () => opts.membership),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    createInvite: vi.fn(),
    findInvite: vi.fn(),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(),
    upsertSharedProfile: vi.fn(),
    removeSharedProfile: vi.fn(),
    findSharedProfile: vi.fn(),
    listSharedProfiles: vi.fn(),
    listSharedProfilesForUser: vi.fn(async () => opts.shares),
  } as unknown as HouseholdRepositoryPort;
}

describe("listMyShares", () => {
  it("non-member cannot list — returns Forbidden", async () => {
    const households = makeHouseholdsRepo({ membership: null, shares: [] });

    const result = await listMyShares(
      { households },
      { householdId: "h1", userId: "u1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não faz parte");
    }
    expect(households.listSharedProfilesForUser).not.toHaveBeenCalled();
  });

  it("member gets only their own shares", async () => {
    const userShares = [makeShare("p1", "u1"), makeShare("p2", "u1")];
    const households = makeHouseholdsRepo({ membership: makeMembership("u1"), shares: userShares });

    const result = await listMyShares(
      { households },
      { householdId: "h1", userId: "u1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(2);
      expect(result.value.every((s) => s.userId === "u1")).toBe(true);
    }
    expect(households.listSharedProfilesForUser).toHaveBeenCalledWith("h1", "u1");
  });

  it("member with no shares returns empty array", async () => {
    const households = makeHouseholdsRepo({ membership: makeMembership("u1"), shares: [] });

    const result = await listMyShares(
      { households },
      { householdId: "h1", userId: "u1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toHaveLength(0);
  });
});

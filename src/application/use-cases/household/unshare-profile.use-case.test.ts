import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity, HouseholdMemberProfileEntity } from "@/domain/entities/household.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { unshareProfile } from "./unshare-profile.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeMembership(userId = "u1"): HouseholdMemberEntity {
  return { householdId: "h1", userId, role: "member", joinedAt: NOW };
}

function makeSharedProfile(userId = "u1"): HouseholdMemberProfileEntity {
  return {
    householdId: "h1",
    userId,
    profileId: "p1",
    shareLevel: "aggregate",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeHouseholdsRepo(opts: {
  membership: HouseholdMemberEntity | null;
  sharedProfile: HouseholdMemberProfileEntity | null;
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
    removeSharedProfile: vi.fn(async () => undefined),
    findSharedProfile: vi.fn(async () => opts.sharedProfile),
    listSharedProfiles: vi.fn(),
    listSharedProfilesForUser: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

describe("unshareProfile", () => {
  it("non-member cannot unshare — returns Forbidden", async () => {
    const households = makeHouseholdsRepo({ membership: null, sharedProfile: makeSharedProfile("u1") });

    const result = await unshareProfile(
      { households },
      { householdId: "h1", userId: "u1", profileId: "p1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(households.removeSharedProfile).not.toHaveBeenCalled();
  });

  it("cannot unshare another member's profile — returns Forbidden", async () => {
    const sharedByOther = makeSharedProfile("u2");
    const households = makeHouseholdsRepo({ membership: makeMembership("u1"), sharedProfile: sharedByOther });

    const result = await unshareProfile(
      { households },
      { householdId: "h1", userId: "u1", profileId: "p1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não é seu");
    }
    expect(households.removeSharedProfile).not.toHaveBeenCalled();
  });

  it("member removes own shared profile — calls removeSharedProfile", async () => {
    const households = makeHouseholdsRepo({ membership: makeMembership("u1"), sharedProfile: makeSharedProfile("u1") });

    const result = await unshareProfile(
      { households },
      { householdId: "h1", userId: "u1", profileId: "p1" },
    );

    expect(isOk(result)).toBe(true);
    expect(households.removeSharedProfile).toHaveBeenCalledOnce();
    expect(households.removeSharedProfile).toHaveBeenCalledWith("h1", "p1");
  });
});

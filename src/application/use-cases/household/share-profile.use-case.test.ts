import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity, HouseholdMemberProfileEntity } from "@/domain/entities/household.entity";
import type { ProfileEntity } from "@/domain/entities/profile.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { shareProfile } from "./share-profile.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeClock(): Clock {
  return { now: vi.fn(() => NOW) };
}

function makeMembership(userId = "u1"): HouseholdMemberEntity {
  return { householdId: "h1", userId, role: "member", joinedAt: NOW };
}

function makeProfile(userId = "u1"): ProfileEntity {
  return {
    id: "p1",
    userId,
    type: "PF",
    linkedProfileId: null,
    displayName: null,
    isPrimary: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeHouseholdsRepo(opts: {
  membership: HouseholdMemberEntity | null;
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
    upsertSharedProfile: vi.fn(async () => undefined),
    removeSharedProfile: vi.fn(),
    findSharedProfile: vi.fn(),
    listSharedProfiles: vi.fn(),
    listSharedProfilesForUser: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

function makeProfilesRepo(profile: ProfileEntity | null): ProfileRepositoryPort {
  return {
    listForUser: vi.fn(),
    findById: vi.fn(async () => profile),
    findPrimaryPf: vi.fn(),
    ensurePfProfile: vi.fn(),
    create: vi.fn(),
    setLinkedProfile: vi.fn(),
  };
}

describe("shareProfile", () => {
  it("non-member cannot share — returns Forbidden", async () => {
    const households = makeHouseholdsRepo({ membership: null });
    const profilesRepo = makeProfilesRepo(makeProfile());

    const result = await shareProfile(
      { households, profiles: profilesRepo, clock: makeClock() },
      { householdId: "h1", userId: "u1", profileId: "p1", shareLevel: "aggregate" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não faz parte");
    }
    expect(households.upsertSharedProfile).not.toHaveBeenCalled();
  });

  it("sharing another user's profile — returns Forbidden", async () => {
    const households = makeHouseholdsRepo({ membership: makeMembership("u1") });
    const otherProfile = makeProfile("u2");
    const profilesRepo = makeProfilesRepo(otherProfile);

    const result = await shareProfile(
      { households, profiles: profilesRepo, clock: makeClock() },
      { householdId: "h1", userId: "u1", profileId: "p1", shareLevel: "aggregate" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não é seu");
    }
    expect(households.upsertSharedProfile).not.toHaveBeenCalled();
  });

  it("member shares own profile — calls upsertSharedProfile with correct level", async () => {
    const households = makeHouseholdsRepo({ membership: makeMembership("u1") });
    const profilesRepo = makeProfilesRepo(makeProfile("u1"));

    const result = await shareProfile(
      { households, profiles: profilesRepo, clock: makeClock() },
      { householdId: "h1", userId: "u1", profileId: "p1", shareLevel: "aggregate" },
    );

    expect(isOk(result)).toBe(true);
    expect(households.upsertSharedProfile).toHaveBeenCalledOnce();
    expect(households.upsertSharedProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "h1",
        userId: "u1",
        profileId: "p1",
        shareLevel: "aggregate",
        now: NOW,
      }),
    );
  });

  it("re-sharing with detail level calls upsert with updated level", async () => {
    const households = makeHouseholdsRepo({ membership: makeMembership("u1") });
    const profilesRepo = makeProfilesRepo(makeProfile("u1"));

    const result = await shareProfile(
      { households, profiles: profilesRepo, clock: makeClock() },
      { householdId: "h1", userId: "u1", profileId: "p1", shareLevel: "detail" },
    );

    expect(isOk(result)).toBe(true);
    expect(households.upsertSharedProfile).toHaveBeenCalledWith(
      expect.objectContaining({ shareLevel: "detail" }),
    );
  });
});

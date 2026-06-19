import { describe, expect, it, vi } from "vitest";

import type { HouseholdInviteEntity, HouseholdMemberEntity } from "@/domain/entities/household.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdInviteNotFound } from "@/domain/errors/household-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { revokeInvite } from "./revoke-invite.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeClock(): Clock {
  return { now: vi.fn(() => NOW) };
}

function makeInvite(overrides: Partial<HouseholdInviteEntity> = {}): HouseholdInviteEntity {
  return {
    id: "inv-1",
    householdId: "h1",
    invitedByUserId: "admin1",
    inviteeRef: "@convidado",
    status: "pending",
    createdAt: new Date("2026-06-17"),
    respondedAt: null,
    ...overrides,
  };
}

function makeMembership(
  role: "admin" | "member",
  userId = "admin1",
): HouseholdMemberEntity {
  return { householdId: "h1", userId, role, joinedAt: new Date("2026-01-01") };
}

function makeHouseholdsRepo({
  invite,
  membership,
}: {
  invite: HouseholdInviteEntity | null;
  membership: HouseholdMemberEntity | null;
}): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    setRole: vi.fn(),
    listMembers: vi.fn(),
    findMembership: vi.fn(async () => membership),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    createInvite: vi.fn(),
    findInvite: vi.fn(async () => invite),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(async () => undefined),
  } as unknown as HouseholdRepositoryPort;
}

describe("revokeInvite", () => {
  it("admin revokes pending invite successfully", async () => {
    const repo = makeHouseholdsRepo({
      invite: makeInvite(),
      membership: makeMembership("admin"),
    });

    const result = await revokeInvite(
      { households: repo, clock: makeClock() },
      { inviteId: "inv-1", adminUserId: "admin1" },
    );

    expect(isOk(result)).toBe(true);
    expect(repo.setInviteStatus).toHaveBeenCalledWith("inv-1", "revoked", NOW);
  });

  it("non-admin cannot revoke", async () => {
    const repo = makeHouseholdsRepo({
      invite: makeInvite(),
      membership: makeMembership("member"),
    });

    const result = await revokeInvite(
      { households: repo, clock: makeClock() },
      { inviteId: "inv-1", adminUserId: "member1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(repo.setInviteStatus).not.toHaveBeenCalled();
  });

  it("non-member cannot revoke", async () => {
    const repo = makeHouseholdsRepo({
      invite: makeInvite(),
      membership: null,
    });

    const result = await revokeInvite(
      { households: repo, clock: makeClock() },
      { inviteId: "inv-1", adminUserId: "outsider" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(repo.setInviteStatus).not.toHaveBeenCalled();
  });

  it("returns HouseholdInviteNotFound when invite does not exist", async () => {
    const repo = makeHouseholdsRepo({
      invite: null,
      membership: makeMembership("admin"),
    });

    const result = await revokeInvite(
      { households: repo, clock: makeClock() },
      { inviteId: "missing", adminUserId: "admin1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdInviteNotFound);
    expect(repo.setInviteStatus).not.toHaveBeenCalled();
  });
});

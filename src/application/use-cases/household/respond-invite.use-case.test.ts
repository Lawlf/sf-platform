import { describe, expect, it, vi } from "vitest";

import type { HouseholdInviteEntity } from "@/domain/entities/household.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import {
  HouseholdInviteInvalidStatus,
  HouseholdInviteNotFound,
} from "@/domain/errors/household-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { respondInvite } from "./respond-invite.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeClock(): Clock {
  return { now: vi.fn(() => NOW) };
}

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "u2",
    email: "joao@example.com",
    emailVerifiedAt: null,
    displayName: "João",
    role: "user",
    plan: "free",
    isPro: false,
    proGraceUntil: null,
    freeKeptProfileId: null,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null,
    homeTourDismissedAt: null,
    acquisitionChannel: null,
    acquisitionChannelOther: null,
    quickAccess: [],
    username: "joao",
    profileFlair: null,
    baseCurrency: "BRL",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeInvite(overrides: Partial<HouseholdInviteEntity> = {}): HouseholdInviteEntity {
  return {
    id: "inv-1",
    householdId: "h1",
    invitedByUserId: "admin1",
    inviteeRef: "@joao",
    status: "pending",
    createdAt: new Date("2026-06-17"),
    respondedAt: null,
    ...overrides,
  };
}

function makeHouseholdsRepo(
  invite: HouseholdInviteEntity | null,
): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(async () => undefined),
    removeMember: vi.fn(),
    setRole: vi.fn(),
    listMembers: vi.fn(),
    findMembership: vi.fn(),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    createInvite: vi.fn(),
    findInvite: vi.fn(async () => invite),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(async () => undefined),
  } as unknown as HouseholdRepositoryPort;
}

function makeUsersRepo(user: UserEntity | null): UserRepositoryPort {
  return {
    findById: vi.fn(async () => user),
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    markOnboardingWizardSeen: vi.fn(),
    markHomeTourDismissed: vi.fn(),
    deactivate: vi.fn(),
    update: vi.fn(),
    findAllPro: vi.fn(),
    findAllActive: vi.fn(),
  } as unknown as UserRepositoryPort;
}

describe("respondInvite", () => {
  it("accept: adds member and marks invite accepted", async () => {
    const invite = makeInvite({ inviteeRef: "@joao" });
    const user = makeUser({ id: "u2", username: "joao" });
    const households = makeHouseholdsRepo(invite);
    const users = makeUsersRepo(user);

    const result = await respondInvite(
      { households, users, clock: makeClock() },
      { inviteId: "inv-1", userId: "u2", accept: true },
    );

    expect(isOk(result)).toBe(true);
    expect(households.addMember).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: "h1", userId: "u2", role: "member" }),
    );
    expect(households.setInviteStatus).toHaveBeenCalledWith("inv-1", "accepted", NOW);
  });

  it("decline: marks invite declined without adding member", async () => {
    const invite = makeInvite({ inviteeRef: "joao@example.com" });
    const user = makeUser({ id: "u2", email: "joao@example.com", username: null });
    const households = makeHouseholdsRepo(invite);
    const users = makeUsersRepo(user);

    const result = await respondInvite(
      { households, users, clock: makeClock() },
      { inviteId: "inv-1", userId: "u2", accept: false },
    );

    expect(isOk(result)).toBe(true);
    expect(households.addMember).not.toHaveBeenCalled();
    expect(households.setInviteStatus).toHaveBeenCalledWith("inv-1", "declined", NOW);
  });

  it("returns HouseholdInviteNotFound when invite does not exist", async () => {
    const result = await respondInvite(
      {
        households: makeHouseholdsRepo(null),
        users: makeUsersRepo(makeUser()),
        clock: makeClock(),
      },
      { inviteId: "missing", userId: "u2", accept: true },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdInviteNotFound);
  });

  it("returns HouseholdInviteInvalidStatus when invite is not pending", async () => {
    const invite = makeInvite({ status: "accepted" });
    const result = await respondInvite(
      {
        households: makeHouseholdsRepo(invite),
        users: makeUsersRepo(makeUser()),
        clock: makeClock(),
      },
      { inviteId: "inv-1", userId: "u2", accept: true },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdInviteInvalidStatus);
  });

  it("returns Forbidden when invite belongs to a different user (by @username)", async () => {
    const invite = makeInvite({ inviteeRef: "@outro" });
    const user = makeUser({ id: "u2", username: "joao" });
    const result = await respondInvite(
      {
        households: makeHouseholdsRepo(invite),
        users: makeUsersRepo(user),
        clock: makeClock(),
      },
      { inviteId: "inv-1", userId: "u2", accept: true },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
  });

  it("returns Forbidden when invite belongs to a different user (by email)", async () => {
    const invite = makeInvite({ inviteeRef: "outro@example.com" });
    const user = makeUser({ id: "u2", email: "joao@example.com" });
    const result = await respondInvite(
      {
        households: makeHouseholdsRepo(invite),
        users: makeUsersRepo(user),
        clock: makeClock(),
      },
      { inviteId: "inv-1", userId: "u2", accept: true },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
  });

  it("returns Forbidden when user is not found", async () => {
    const invite = makeInvite({ inviteeRef: "@joao" });
    const result = await respondInvite(
      {
        households: makeHouseholdsRepo(invite),
        users: makeUsersRepo(null),
        clock: makeClock(),
      },
      { inviteId: "inv-1", userId: "ghost", accept: true },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
  });
});

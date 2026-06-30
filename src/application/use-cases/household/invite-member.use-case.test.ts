import { describe, expect, it, vi } from "vitest";

import type {
  HouseholdInviteEntity,
  HouseholdMemberEntity,
} from "@/domain/entities/household.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdAlreadyMember } from "@/domain/errors/household-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { inviteMember } from "./invite-member.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeClock(): Clock {
  return { now: vi.fn(() => NOW) };
}

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "u2",
    email: "convidado@example.com",
    emailVerifiedAt: null,
    displayName: "Convidado",
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
    username: "convidado",
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
    inviteeRef: "@convidado",
    status: "pending",
    createdAt: NOW,
    respondedAt: null,
    ...overrides,
  };
}

function makeMembership(
  role: "admin" | "member",
  userId = "admin1",
): HouseholdMemberEntity {
  return {
    householdId: "h1",
    userId,
    role,
    joinedAt: new Date("2026-01-01"),
  };
}

function makeHouseholdsRepo({
  inviterMembership,
  inviteeMembership = null,
}: {
  inviterMembership: HouseholdMemberEntity | null;
  inviteeMembership?: HouseholdMemberEntity | null;
}): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    setRole: vi.fn(),
    listMembers: vi.fn(),
    findMembership: vi.fn(async (_householdId: string, userId: string) => {
      if (userId === "admin1") return inviterMembership;
      return inviteeMembership;
    }),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    createInvite: vi.fn(async () => makeInvite()),
    findInvite: vi.fn(),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

function makeUsersRepo(resolvedUser: UserEntity | null = null): UserRepositoryPort {
  return {
    findById: vi.fn(),
    findByUsername: vi.fn(async () => resolvedUser),
    findByEmail: vi.fn(async () => resolvedUser),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    markOnboardingWizardSeen: vi.fn(),
    markHomeTourDismissed: vi.fn(),
    deactivate: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    findAllPro: vi.fn(),
    findAllActive: vi.fn(),
  } as unknown as UserRepositoryPort;
}

function makeNotificationsRepo(): NotificationRepositoryPort {
  return {
    findById: vi.fn(),
    findByUserAndKindAndMonth: vi.fn(),
    listForUser: vi.fn(),
    countUndismissedForUser: vi.fn(),
    countUnreadForUser: vi.fn(),
    create: vi.fn(async (n) => n),
    markDismissed: vi.fn(),
    markAllReadForUser: vi.fn(),
  } as unknown as NotificationRepositoryPort;
}

describe("inviteMember", () => {
  it("non-admin cannot invite", async () => {
    const households = makeHouseholdsRepo({ inviterMembership: makeMembership("member") });
    const result = await inviteMember(
      {
        households,
        users: makeUsersRepo(),
        notifications: makeNotificationsRepo(),
        clock: makeClock(),
      },
      { householdId: "h1", inviterUserId: "admin1", inviteeRef: "@convidado" },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
    expect(households.createInvite).not.toHaveBeenCalled();
  });

  it("non-member inviter cannot invite", async () => {
    const households = makeHouseholdsRepo({ inviterMembership: null });
    const result = await inviteMember(
      {
        households,
        users: makeUsersRepo(),
        notifications: makeNotificationsRepo(),
        clock: makeClock(),
      },
      { householdId: "h1", inviterUserId: "admin1", inviteeRef: "@convidado" },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(Forbidden);
  });

  it("already member invitee is rejected", async () => {
    const inviteeUser = makeUser({ id: "u2", username: "convidado" });
    const households = makeHouseholdsRepo({
      inviterMembership: makeMembership("admin"),
      inviteeMembership: makeMembership("member", "u2"),
    });
    const users = makeUsersRepo(inviteeUser);
    const result = await inviteMember(
      {
        households,
        users,
        notifications: makeNotificationsRepo(),
        clock: makeClock(),
      },
      { householdId: "h1", inviterUserId: "admin1", inviteeRef: "@convidado" },
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error).toBeInstanceOf(HouseholdAlreadyMember);
  });

  it("creates invite and notifies existing user (by @username)", async () => {
    const inviteeUser = makeUser({ id: "u2", username: "convidado" });
    const households = makeHouseholdsRepo({
      inviterMembership: makeMembership("admin"),
      inviteeMembership: null,
    });
    const users = makeUsersRepo(inviteeUser);
    const notifications = makeNotificationsRepo();

    const result = await inviteMember(
      { households, users, notifications, clock: makeClock() },
      { householdId: "h1", inviterUserId: "admin1", inviteeRef: "@convidado" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.invite.status).toBe("pending");
      expect(result.value.notifiedUser?.id).toBe("u2");
    }
    expect(notifications.create).toHaveBeenCalledOnce();
    const notifCall = (notifications.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | { kind: string; userId: string }
      | undefined;
    expect(notifCall?.kind).toBe("household_invite");
    expect(notifCall?.userId).toBe("u2");
  });

  it("creates invite without notification for unknown email", async () => {
    const households = makeHouseholdsRepo({ inviterMembership: makeMembership("admin") });
    const users = makeUsersRepo(null);
    const notifications = makeNotificationsRepo();

    const result = await inviteMember(
      { households, users, notifications, clock: makeClock() },
      { householdId: "h1", inviterUserId: "admin1", inviteeRef: "novato@example.com" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.notifiedUser).toBeNull();
    }
    expect(notifications.create).not.toHaveBeenCalled();
    expect(users.findByEmail).toHaveBeenCalledWith("novato@example.com");
  });
});

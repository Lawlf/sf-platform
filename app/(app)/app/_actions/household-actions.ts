"use server";

import { z } from "zod";

import { createHousehold } from "@/application/use-cases/household/create-household.use-case";
import { inviteMember } from "@/application/use-cases/household/invite-member.use-case";
import { leaveHousehold } from "@/application/use-cases/household/leave-household.use-case";
import { removeMember } from "@/application/use-cases/household/remove-member.use-case";
import { respondInvite } from "@/application/use-cases/household/respond-invite.use-case";
import { revokeInvite } from "@/application/use-cases/household/revoke-invite.use-case";
import { setMemberRole } from "@/application/use-cases/household/set-member-role.use-case";
import type { HouseholdRole } from "@/domain/entities/household.entity";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const createHouseholdAction = action({
  schema: z.object({ name: z.string().min(1, "Dê um nome ao lar.").max(100) }),
  revalidates: ["household"],
  handler: async ({ name }, { userId }) => {
    unwrap(
      await createHousehold({ households: repos.households, clock }, { userId, name }),
    );
  },
});

export const inviteMemberAction = action({
  schema: z.object({
    householdId: z.string().uuid(),
    inviteeRef: z.string().min(1, "Informe o @usuário ou e-mail."),
  }),
  revalidates: ["household"],
  handler: async ({ householdId, inviteeRef }, { userId }) => {
    unwrap(
      await inviteMember(
        { households: repos.households, users: repos.users, notifications: repos.notifications, clock },
        { householdId, inviterUserId: userId, inviteeRef },
      ),
    );
  },
});

export const respondInviteAction = action({
  schema: z.object({
    inviteId: z.string().uuid(),
    accept: z.boolean(),
  }),
  revalidates: ["household", "notifications"],
  handler: async ({ inviteId, accept }, { userId }) => {
    unwrap(
      await respondInvite(
        { households: repos.households, users: repos.users, clock },
        { inviteId, userId, accept },
      ),
    );
  },
});

export const revokeInviteAction = action({
  schema: z.object({ inviteId: z.string().uuid() }),
  revalidates: ["household"],
  handler: async ({ inviteId }, { userId }) => {
    unwrap(
      await revokeInvite(
        { households: repos.households, clock },
        { inviteId, adminUserId: userId },
      ),
    );
  },
});

export const leaveHouseholdAction = action({
  schema: z.object({ householdId: z.string().uuid() }),
  revalidates: ["household"],
  handler: async ({ householdId }, { userId }) => {
    unwrap(
      await leaveHousehold(
        { households: repos.households },
        { householdId, userId },
      ),
    );
  },
});

export const removeMemberAction = action({
  schema: z.object({
    householdId: z.string().uuid(),
    targetUserId: z.string().uuid(),
  }),
  revalidates: ["household"],
  handler: async ({ householdId, targetUserId }, { userId }) => {
    unwrap(
      await removeMember(
        { households: repos.households },
        { householdId, adminUserId: userId, targetUserId },
      ),
    );
  },
});

export const setMemberRoleAction = action({
  schema: z.object({
    householdId: z.string().uuid(),
    targetUserId: z.string().uuid(),
    role: z.enum(["admin", "member"]),
  }),
  revalidates: ["household"],
  handler: async ({ householdId, targetUserId, role }, { userId }) => {
    unwrap(
      await setMemberRole(
        { households: repos.households },
        { householdId, adminUserId: userId, targetUserId, role: role as HouseholdRole },
      ),
    );
  },
});

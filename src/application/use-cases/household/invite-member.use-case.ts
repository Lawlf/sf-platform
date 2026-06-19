import type { HouseholdInviteEntity } from "@/domain/entities/household.entity";
import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdAlreadyMember } from "@/domain/errors/household-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface InviteMemberDeps {
  households: HouseholdRepositoryPort;
  users: UserRepositoryPort;
  notifications: NotificationRepositoryPort;
  clock: Clock;
}

export interface InviteMemberInput {
  householdId: string;
  inviterUserId: string;
  inviteeRef: string;
}

export interface InviteMemberOutput {
  invite: HouseholdInviteEntity;
  notifiedUser: UserEntity | null;
}

async function resolveUser(
  users: UserRepositoryPort,
  inviteeRef: string,
): Promise<UserEntity | null> {
  if (inviteeRef.startsWith("@")) {
    return users.findByUsername(inviteeRef.slice(1));
  }
  return users.findByEmail(inviteeRef);
}

export async function inviteMember(
  deps: InviteMemberDeps,
  input: InviteMemberInput,
): Promise<Result<InviteMemberOutput, Forbidden | HouseholdAlreadyMember>> {
  const membership = await deps.households.findMembership(input.householdId, input.inviterUserId);
  if (!membership || membership.role !== "admin") {
    return err(new Forbidden("Apenas administradores podem convidar membros."));
  }

  const resolvedUser = await resolveUser(deps.users, input.inviteeRef);

  if (resolvedUser) {
    const existingMembership = await deps.households.findMembership(
      input.householdId,
      resolvedUser.id,
    );
    if (existingMembership) {
      return err(new HouseholdAlreadyMember("Já faz parte do lar."));
    }
  }

  const now = deps.clock.now();
  const invite = await deps.households.createInvite({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    invitedByUserId: input.inviterUserId,
    inviteeRef: input.inviteeRef,
    now,
  });

  let notifiedUser: UserEntity | null = null;
  if (resolvedUser) {
    const notification: NotificationEntity = {
      id: crypto.randomUUID(),
      userId: resolvedUser.id,
      kind: "household_invite",
      monthIso: null,
      triggeredAt: now,
      payload: {
        eyebrow: "Convite de lar",
        line: "Você foi convidado para participar de um lar.",
        iconName: "Home",
        householdId: input.householdId,
        inviteId: invite.id,
      },
      dismissedAt: null,
      readAt: null,
      createdAt: now,
    };
    await deps.notifications.create(notification);
    notifiedUser = resolvedUser;
  }

  return ok({ invite, notifiedUser });
}

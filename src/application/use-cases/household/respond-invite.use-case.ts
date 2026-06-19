import { Forbidden } from "@/domain/errors/auth-errors";
import {
  HouseholdInviteInvalidStatus,
  HouseholdInviteNotFound,
} from "@/domain/errors/household-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RespondInviteDeps {
  households: HouseholdRepositoryPort;
  users: UserRepositoryPort;
  clock: Clock;
}

export interface RespondInviteInput {
  inviteId: string;
  userId: string;
  accept: boolean;
}

function inviteIsForUser(inviteeRef: string, user: { username: string | null; email: string }): boolean {
  if (inviteeRef.startsWith("@")) {
    return user.username !== null && inviteeRef === `@${user.username}`;
  }
  return inviteeRef === user.email;
}

export async function respondInvite(
  deps: RespondInviteDeps,
  input: RespondInviteInput,
): Promise<
  Result<void, HouseholdInviteNotFound | HouseholdInviteInvalidStatus | Forbidden>
> {
  const invite = await deps.households.findInvite(input.inviteId);
  if (!invite) {
    return err(new HouseholdInviteNotFound("Convite não encontrado."));
  }

  if (invite.status !== "pending") {
    return err(new HouseholdInviteInvalidStatus("Este convite não está mais pendente."));
  }

  const user = await deps.users.findById(input.userId);
  if (!user || !inviteIsForUser(invite.inviteeRef, user)) {
    return err(new Forbidden("Este convite não é para você."));
  }

  const now = deps.clock.now();

  if (input.accept) {
    await deps.households.addMember({
      householdId: invite.householdId,
      userId: input.userId,
      role: "member",
      now,
    });
    await deps.households.setInviteStatus(input.inviteId, "accepted", now);
  } else {
    await deps.households.setInviteStatus(input.inviteId, "declined", now);
  }

  return ok(undefined);
}

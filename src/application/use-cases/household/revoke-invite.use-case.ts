import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdInviteNotFound } from "@/domain/errors/household-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RevokeInviteDeps {
  households: HouseholdRepositoryPort;
  clock: Clock;
}

export interface RevokeInviteInput {
  inviteId: string;
  adminUserId: string;
}

export async function revokeInvite(
  deps: RevokeInviteDeps,
  input: RevokeInviteInput,
): Promise<Result<void, HouseholdInviteNotFound | Forbidden>> {
  const invite = await deps.households.findInvite(input.inviteId);
  if (!invite) {
    return err(new HouseholdInviteNotFound("Convite não encontrado."));
  }

  const membership = await deps.households.findMembership(invite.householdId, input.adminUserId);
  if (!membership || membership.role !== "admin") {
    return err(new Forbidden("Apenas administradores podem revogar convites."));
  }

  await deps.households.setInviteStatus(input.inviteId, "revoked", deps.clock.now());
  return ok(undefined);
}

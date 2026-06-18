import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdNotMember } from "@/domain/errors/household-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { nextAdminAfterLeave } from "@/domain/services/household/household-membership.service";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RemoveMemberDeps {
  households: HouseholdRepositoryPort;
}

export interface RemoveMemberInput {
  householdId: string;
  adminUserId: string;
  targetUserId: string;
}

export async function removeMember(
  deps: RemoveMemberDeps,
  input: RemoveMemberInput,
): Promise<Result<void, Forbidden | HouseholdNotMember>> {
  const adminMembership = await deps.households.findMembership(
    input.householdId,
    input.adminUserId,
  );
  if (!adminMembership || adminMembership.role !== "admin") {
    return err(new Forbidden("Apenas administradores podem remover membros."));
  }

  if (input.adminUserId === input.targetUserId) {
    return err(new Forbidden("Para sair do lar, use a opção de sair."));
  }

  const targetMembership = await deps.households.findMembership(
    input.householdId,
    input.targetUserId,
  );
  if (!targetMembership) {
    return err(new HouseholdNotMember("Este usuário não faz parte do lar."));
  }

  const members = await deps.households.listMembers(input.householdId);
  const { dissolve, promoteUserId } = nextAdminAfterLeave(members, input.targetUserId);

  await deps.households.removeSharedProfilesForUser(input.householdId, input.targetUserId);
  await deps.households.removeMember(input.householdId, input.targetUserId);

  if (dissolve) {
    await deps.households.deleteHousehold(input.householdId);
  } else if (promoteUserId) {
    await deps.households.setRole(input.householdId, promoteUserId, "admin");
  }

  return ok(undefined);
}

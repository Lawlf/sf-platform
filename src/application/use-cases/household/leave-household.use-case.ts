import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdNotMember } from "@/domain/errors/household-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { nextAdminAfterLeave } from "@/domain/services/household/household-membership.service";
import { err, ok, type Result } from "@/shared/errors/result";

export interface LeaveHouseholdDeps {
  households: HouseholdRepositoryPort;
}

export interface LeaveHouseholdInput {
  householdId: string;
  userId: string;
}

export async function leaveHousehold(
  deps: LeaveHouseholdDeps,
  input: LeaveHouseholdInput,
): Promise<Result<void, Forbidden | HouseholdNotMember>> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new HouseholdNotMember("Você não faz parte deste lar."));
  }

  const members = await deps.households.listMembers(input.householdId);
  const { dissolve, promoteUserId } = nextAdminAfterLeave(members, input.userId);

  await deps.households.removeSharedProfilesForUser(input.householdId, input.userId);
  await deps.households.removeMember(input.householdId, input.userId);

  if (dissolve) {
    await deps.households.deleteHousehold(input.householdId);
  } else if (promoteUserId) {
    await deps.households.setRole(input.householdId, promoteUserId, "admin");
  }

  return ok(undefined);
}

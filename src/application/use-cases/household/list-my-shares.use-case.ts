import type { HouseholdMemberProfileEntity } from "@/domain/entities/household.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ListMySharesDeps {
  households: HouseholdRepositoryPort;
}

export interface ListMySharesInput {
  householdId: string;
  userId: string;
}

export async function listMyShares(
  deps: ListMySharesDeps,
  input: ListMySharesInput,
): Promise<Result<HouseholdMemberProfileEntity[], Forbidden>> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não faz parte deste lar."));
  }

  const shares = await deps.households.listSharedProfilesForUser(input.householdId, input.userId);

  return ok(shares);
}

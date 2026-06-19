import { Forbidden } from "@/domain/errors/auth-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface UnshareProfileDeps {
  households: HouseholdRepositoryPort;
}

export interface UnshareProfileInput {
  householdId: string;
  userId: string;
  profileId: string;
}

export async function unshareProfile(
  deps: UnshareProfileDeps,
  input: UnshareProfileInput,
): Promise<Result<void, Forbidden>> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não faz parte deste lar."));
  }

  const shared = await deps.households.findSharedProfile(input.householdId, input.profileId);
  if (!shared || shared.userId !== input.userId) {
    return err(new Forbidden("Esse perfil não é seu."));
  }

  await deps.households.removeSharedProfile(input.householdId, input.profileId);

  return ok(undefined);
}

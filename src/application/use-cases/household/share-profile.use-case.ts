import { Forbidden } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { HouseholdShareLevel } from "@/domain/entities/household.entity";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ShareProfileDeps {
  households: HouseholdRepositoryPort;
  profiles: ProfileRepositoryPort;
  clock: Clock;
}

export interface ShareProfileInput {
  householdId: string;
  userId: string;
  profileId: string;
  shareLevel: HouseholdShareLevel;
}

export async function shareProfile(
  deps: ShareProfileDeps,
  input: ShareProfileInput,
): Promise<Result<void, Forbidden>> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não faz parte deste lar."));
  }

  const profile = await deps.profiles.findById(input.profileId);
  if (!profile || profile.userId !== input.userId) {
    return err(new Forbidden("Esse perfil não é seu."));
  }

  await deps.households.upsertSharedProfile({
    householdId: input.householdId,
    userId: input.userId,
    profileId: input.profileId,
    shareLevel: input.shareLevel,
    now: deps.clock.now(),
  });

  return ok(undefined);
}

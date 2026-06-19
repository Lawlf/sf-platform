import type { ProfileEntity, ProfileTaxClassification, ProfileType } from "@/domain/entities/profile.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface CreateProfileDeps {
  profiles: Pick<ProfileRepositoryPort, "create">;
  clock: Clock;
}

export interface CreateProfileInput {
  userId: string;
  type: ProfileType;
  displayName: string | null;
  taxClassification?: ProfileTaxClassification | null;
}

export async function createProfile(
  deps: CreateProfileDeps,
  input: CreateProfileInput,
): Promise<Result<ProfileEntity, never>> {
  const now = deps.clock.now();
  const profile = await deps.profiles.create({
    userId: input.userId,
    type: input.type,
    linkedProfileId: null,
    displayName: input.displayName,
    isPrimary: false,
    taxClassification: input.taxClassification ?? null,
    now,
  });
  return ok(profile);
}

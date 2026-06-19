import { Forbidden } from "@/domain/errors/auth-errors";
import { ProfileNotFound } from "@/domain/errors/profile-errors";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RenameProfileDeps {
  profiles: Pick<ProfileRepositoryPort, "findById" | "rename">;
}

export interface RenameProfileInput {
  userId: string;
  profileId: string;
  displayName: string;
}

export async function renameProfile(
  deps: RenameProfileDeps,
  input: RenameProfileInput,
): Promise<Result<void, ProfileNotFound | Forbidden>> {
  const profile = await deps.profiles.findById(input.profileId);

  if (!profile) {
    return err(new ProfileNotFound("Perfil não encontrado."));
  }

  if (profile.userId !== input.userId) {
    return err(new Forbidden("Esse perfil não é seu."));
  }

  await deps.profiles.rename(input.profileId, input.displayName.trim());

  return ok(undefined);
}

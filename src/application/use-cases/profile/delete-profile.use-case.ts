import { Forbidden } from "@/domain/errors/auth-errors";
import { ProfileNotFound, ProfilePrimaryCannotBeDeleted } from "@/domain/errors/profile-errors";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface DeleteProfileDeps {
  profiles: Pick<
    ProfileRepositoryPort,
    "findById" | "findByLinkedProfileId" | "setLinkedProfile" | "delete"
  >;
}

export interface DeleteProfileInput {
  userId: string;
  profileId: string;
}

export async function deleteProfile(
  deps: DeleteProfileDeps,
  input: DeleteProfileInput,
): Promise<Result<void, ProfileNotFound | Forbidden | ProfilePrimaryCannotBeDeleted>> {
  const profile = await deps.profiles.findById(input.profileId);

  if (!profile) {
    return err(new ProfileNotFound("Perfil não encontrado."));
  }

  if (profile.userId !== input.userId) {
    return err(new Forbidden("Esse perfil não é seu."));
  }

  if (profile.isPrimary) {
    return err(new ProfilePrimaryCannotBeDeleted("Não dá pra excluir seu perfil principal."));
  }

  const linkedPf = await deps.profiles.findByLinkedProfileId(input.profileId);
  if (linkedPf) {
    await deps.profiles.setLinkedProfile(linkedPf.id, null);
  }

  await deps.profiles.delete(input.profileId);

  return ok(undefined);
}

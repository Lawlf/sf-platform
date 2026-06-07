import type { UserEntity } from "@/domain/entities/user.entity";
import { flairFor } from "@/domain/services/profile-identity.service";

export interface SetProfileFlairDeps {
  users: {
    findById: (id: string) => Promise<UserEntity | null>;
    update: (user: UserEntity) => Promise<void>;
  };
}

export async function setProfileFlair(
  deps: SetProfileFlairDeps,
  input: { userId: string; flairKey: string | null },
): Promise<boolean> {
  if (input.flairKey !== null && flairFor(input.flairKey) === null) return false;
  const user = await deps.users.findById(input.userId);
  if (!user) return false;
  await deps.users.update({ ...user, profileFlair: input.flairKey, updatedAt: new Date() });
  return true;
}

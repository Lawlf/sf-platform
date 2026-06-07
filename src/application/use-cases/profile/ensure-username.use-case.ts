import type { UserEntity } from "@/domain/entities/user.entity";
import { generateUsernameBase } from "@/domain/services/profile-identity.service";

export interface EnsureUsernameDeps {
  users: {
    findById: (id: string) => Promise<UserEntity | null>;
    findByUsername: (username: string) => Promise<UserEntity | null>;
    update: (user: UserEntity) => Promise<void>;
  };
}

export async function ensureUsername(
  deps: EnsureUsernameDeps,
  input: { userId: string },
): Promise<string | null> {
  const user = await deps.users.findById(input.userId);
  if (!user) return null;
  if (user.username) return user.username;

  const localPart = (user.email.split("@")[0] ?? "").replace(/\./g, " ");
  const base = generateUsernameBase(user.displayName ?? localPart);
  let candidate = base;
  let n = 1;
  while (await deps.users.findByUsername(candidate)) {
    n += 1;
    candidate = `${base}${n}`;
  }

  await deps.users.update({ ...user, username: candidate, updatedAt: new Date() });
  return candidate;
}

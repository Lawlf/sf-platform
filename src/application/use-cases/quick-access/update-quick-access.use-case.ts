import type { UserEntity } from "@/domain/entities/user.entity";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { MAX_QUICK_ACCESS, normalizeQuickAccess } from "@/domain/services/quick-access.service";

export interface UpdateQuickAccessDeps {
  users: Pick<UserRepositoryPort, "update">;
}

export interface UpdateQuickAccessInput {
  user: UserEntity;
  keys: string[];
  allowedKeys: string[];
  now: Date;
}

/** Normaliza as chaves e persiste em user.quickAccess. Retorna a lista normalizada. */
export async function updateQuickAccess(
  deps: UpdateQuickAccessDeps,
  input: UpdateQuickAccessInput,
): Promise<string[]> {
  const normalized = normalizeQuickAccess(input.keys, input.allowedKeys, MAX_QUICK_ACCESS);
  const updated: UserEntity = { ...input.user, quickAccess: normalized, updatedAt: input.now };
  await deps.users.update(updated);
  return normalized;
}

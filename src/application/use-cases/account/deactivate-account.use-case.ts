import type { SessionRepositoryPort } from "@/domain/ports/repositories/session.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface DeactivateAccountDeps {
  users: UserRepositoryPort;
  sessions: SessionRepositoryPort;
}

export interface DeactivateAccountInput {
  userId: string;
  reason: string | null;
}

export async function deactivateAccount(
  deps: DeactivateAccountDeps,
  input: DeactivateAccountInput,
): Promise<Result<void, never>> {
  await deps.users.deactivate(input.userId, input.reason);
  await deps.sessions.deleteAllForUser(input.userId);
  return ok(undefined);
}

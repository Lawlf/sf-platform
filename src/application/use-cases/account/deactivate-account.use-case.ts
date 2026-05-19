import type { SessionRepository } from "@/domain/ports/repositories/session.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import { ok, type Result } from "@/shared/errors";

export interface DeactivateAccountDeps {
  users: UserRepository;
  sessions: SessionRepository;
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

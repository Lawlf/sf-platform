import type { SessionRepositoryPort } from "@/domain/ports/repositories/session.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { ok, type Result } from "@/shared/errors/result";

export const DELETION_REASON = "exclusao_solicitada" as const;

export interface DeleteAccountDeps {
  users: Pick<UserRepositoryPort, "deactivate">;
  sessions: Pick<SessionRepositoryPort, "deleteAllForUser">;
}

export interface DeleteAccountInput {
  userId: string;
}

export async function deleteAccount(
  deps: DeleteAccountDeps,
  input: DeleteAccountInput,
): Promise<Result<void, never>> {
  await deps.sessions.deleteAllForUser(input.userId);
  await deps.users.deactivate(input.userId, DELETION_REASON);
  return ok(undefined);
}

import { Forbidden, SessionNotFound } from "@/domain/errors/auth-errors";
import type { SessionRepository } from "@/domain/ports/repositories/session.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RevokeSessionDeps {
  sessions: SessionRepository;
}

export interface RevokeSessionInput {
  userId: string;
  publicSessionId: string;
}

export async function revokeSession(
  deps: RevokeSessionDeps,
  input: RevokeSessionInput,
): Promise<Result<void, SessionNotFound | Forbidden>> {
  const rows = await deps.sessions.listActiveForUser(input.userId);
  const match = rows.find((s) => s.idHash.startsWith(input.publicSessionId));
  if (!match) return err(new SessionNotFound("Sessao nao encontrada."));
  if (match.userId !== input.userId) return err(new Forbidden("Acesso negado."));
  await deps.sessions.delete(match.idHash);
  return ok(undefined);
}

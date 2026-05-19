import type { SessionRepository } from "@/domain/ports/repositories/session.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";

export interface SignOutDeps {
  sessions: SessionRepository;
  hasher: Hasher;
}

export async function signOut(deps: SignOutDeps, rawSessionId: string): Promise<void> {
  const idHash = await deps.hasher.sha256Hex(rawSessionId);
  await deps.sessions.delete(idHash);
}

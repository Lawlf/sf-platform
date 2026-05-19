import type { SessionRepository } from "@/domain/ports/repositories/session.repository";

export interface SessionDTO {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ip: string | null;
  userAgent: string | null;
}

export interface ListSessionsDeps {
  sessions: SessionRepository;
}

export async function listSessions(deps: ListSessionsDeps, userId: string): Promise<SessionDTO[]> {
  const rows = await deps.sessions.listActiveForUser(userId);
  return rows.map((s) => ({
    id: s.idHash.slice(0, 12),
    userId: s.userId,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    ip: s.ip,
    userAgent: s.userAgent,
  }));
}

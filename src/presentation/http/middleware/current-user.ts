import { cookies } from "next/headers";

import type { UserEntity } from "@/domain/entities/user.entity";
import type { SessionRepository } from "@/domain/ports/repositories/session.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import { SESSION_COOKIE_NAME } from "@/infrastructure/auth/session-cookie";

export interface CurrentUserDeps {
  sessions: SessionRepository;
  users: UserRepository;
  hasher: Hasher;
  now: Date;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function loadCurrentUser(deps: CurrentUserDeps): Promise<UserEntity | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const idHash = await deps.hasher.sha256Hex(raw);
  const session = await deps.sessions.findByIdHash(idHash);
  if (!session) return null;
  if (session.expiresAt < deps.now) {
    await deps.sessions.delete(idHash);
    return null;
  }
  const user = await deps.users.findById(session.userId);
  if (!user || user.deactivatedAt) return null;
  const newExpires = new Date(deps.now.getTime() + SESSION_TTL_MS);
  await deps.sessions.touch(idHash, newExpires, deps.now);
  return user;
}

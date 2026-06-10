import { cookies } from "next/headers";

import type { UserEntity } from "@/domain/entities/user.entity";
import type { SessionRepositoryPort } from "@/domain/ports/repositories/session.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import { SESSION_COOKIE_NAME } from "@/infrastructure/auth/session-cookie";

export interface CurrentUserDeps {
  sessions: SessionRepositoryPort;
  users: UserRepositoryPort;
  hasher: Hasher;
  now: Date;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_THROTTLE_MS = 5 * 60 * 1000;

export async function loadCurrentUser(deps: CurrentUserDeps): Promise<UserEntity | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const idHash = await deps.hasher.sha256Hex(raw);
  const found = await deps.sessions.findWithUserByIdHash(idHash);
  if (!found) return null;

  const { session, user } = found;
  if (session.expiresAt < deps.now) {
    await deps.sessions.delete(idHash);
    return null;
  }
  if (user.deactivatedAt) return null;

  const sinceLastTouch = deps.now.getTime() - session.lastUsedAt.getTime();
  if (sinceLastTouch >= TOUCH_THROTTLE_MS) {
    const newExpires = new Date(deps.now.getTime() + SESSION_TTL_MS);
    await deps.sessions.touch(idHash, newExpires, deps.now);
  }

  return user;
}

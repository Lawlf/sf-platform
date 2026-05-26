import { SESSION_MAX_AGE_SECONDS } from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";

/** Creates a persisted session row and returns the raw (cookie) session id. */
export async function issueSession(
  userId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<{ rawSessionId: string; expiresAt: Date }> {
  const random = new WebCryptoRandomGenerator();
  const hasher = new WebCryptoHasher();
  const rawSessionId = random.urlToken();
  const idHash = await hasher.sha256Hex(rawSessionId);
  const expiresAt = new Date(new SystemClock().now().getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  await new DrizzleSessionRepository().create({ idHash, userId, expiresAt, ip, userAgent });
  return { rawSessionId, expiresAt };
}

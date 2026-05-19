"use server";

import { revalidatePath } from "next/cache";

import { revokeSession } from "@/application/use-cases/auth/revoke-session.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

export async function revokeSessionAction(
  publicSessionId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
  const result = await revokeSession(
    { sessions: new DrizzleSessionRepository() },
    { userId: user.id, publicSessionId },
  );
  if (isErr(result)) {
    return { ok: false, message: result.error.message };
  }
  revalidatePath("/app/perfil/seguranca");
  return { ok: true };
}

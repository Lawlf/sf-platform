"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { revokeSession } from "@/application/use-cases/auth/revoke-session.use-case";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

const schema = z.string().regex(/^[a-f0-9]{8,64}$/);

export async function revokeSessionAction(
  publicSessionId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(publicSessionId);
  if (!parsed.success) {
    return { ok: false, message: "Sessão inválida." };
  }
  const result = await revokeSession(
    { sessions: new DrizzleSessionRepository() },
    { userId: user.id, publicSessionId: parsed.data },
  );
  if (isErr(result)) {
    return { ok: false, message: result.error.message };
  }
  revalidatePath("/app/perfil/seguranca");
  return { ok: true };
}

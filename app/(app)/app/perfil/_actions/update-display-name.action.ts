"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateUserDisplayName } from "@/application/use-cases/user/update-user-display-name.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const schema = z.object({ displayName: z.string().min(1).max(120) });

export type UpdateDisplayNameResult = { ok: true } | { ok: false; message: string };

export async function updateDisplayNameAction(
  formData: FormData,
): Promise<UpdateDisplayNameResult> {
  const parsed = schema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) return { ok: false, message: "Nome inválido." };

  const user = await requireUser();

  const result = await updateUserDisplayName(
    { users: new DrizzleUserRepository(), clock: new SystemClock() },
    { userId: user.id, displayName: parsed.data.displayName },
  );
  if (!isOk(result)) {
    return { ok: false, message: result.error.message ?? "Erro ao atualizar nome." };
  }
  revalidatePath("/app/perfil");
  revalidatePath("/app");
  return { ok: true };
}

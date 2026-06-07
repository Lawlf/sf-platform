"use server";

import { revalidatePath } from "next/cache";

import { setProfileFlair } from "@/application/use-cases/profile/set-profile-flair.use-case";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export async function setFlairAction(flairKey: string | null): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const ok = await setProfileFlair(
    { users: new DrizzleUserRepository() },
    { userId: user.id, flairKey },
  );
  if (ok) {
    revalidatePath("/app/perfil");
    revalidatePath("/app/configuracoes/estilo");
  }
  return { ok };
}

"use server";

import { revalidatePath } from "next/cache";

import { DrizzleUserAvatarRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-avatar.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export async function removeAvatarAction(): Promise<{ ok: true }> {
  const user = await requireUser();
  await new DrizzleUserAvatarRepository().delete(user.id);

  revalidatePath("/app/perfil");
  revalidatePath("/app");
  return { ok: true };
}

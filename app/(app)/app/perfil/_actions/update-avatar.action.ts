"use server";

import { revalidatePath } from "next/cache";

import { DrizzleUserAvatarRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-avatar.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { validateAvatarDataUrl } from "./avatar-validation";

export type UpdateAvatarResult = { ok: true } | { ok: false; message: string };

export async function updateAvatarAction(dataUrl: unknown): Promise<UpdateAvatarResult> {
  const validation = validateAvatarDataUrl(dataUrl);
  if (!validation.ok) return validation;

  const user = await requireUser();
  await new DrizzleUserAvatarRepository().upsert(user.id, validation.dataUrl);

  revalidatePath("/app/perfil");
  revalidatePath("/app");
  return { ok: true };
}

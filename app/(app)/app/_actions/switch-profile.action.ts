"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { repos } from "@/infrastructure/container";
import {
  ACTIVE_PROFILE_COOKIE,
} from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import type { ActionResult } from "@/presentation/actions/action";

const schema = z.object({
  profileId: z.string().min(1),
});

export async function switchProfileAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const user = await requireUser();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  const { profileId } = parsed.data;

  const owned = await repos.profiles.listForUser(user.id);
  const belongs = owned.some((p) => p.id === profileId);
  if (!belongs) {
    return { ok: false, message: "Perfil não encontrado." };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: ACTIVE_PROFILE_COOKIE,
    value: profileId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });

  revalidatePath("/app", "layout");
  return { ok: true, data: undefined };
}

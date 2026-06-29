"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { isInGrace, isProfileAccessible } from "@/domain/services/profile-access.service";
import { clock, repos } from "@/infrastructure/container";
import type { ActionResult } from "@/presentation/actions/action";
import {
  ACTIVE_PROFILE_COOKIE,
} from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";


const schema = z.object({
  profileId: z.string().min(1),
});

function setActiveCookie(store: Awaited<ReturnType<typeof cookies>>, profileId: string) {
  store.set({
    name: ACTIVE_PROFILE_COOKIE,
    value: profileId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}

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
  if (!owned.some((p) => p.id === profileId)) {
    return { ok: false, message: "Perfil não encontrado." };
  }

  const accessible = isProfileAccessible(profileId, owned, {
    isPro: user.isPro,
    proGraceUntil: user.proGraceUntil,
    freeKeptProfileId: user.freeKeptProfileId,
    now: clock.now(),
  });
  if (!accessible) {
    return {
      ok: false,
      message: "Esse perfil está guardado. No Free você usa um por vez; volte pro Pro pra usar mais de um.",
    };
  }

  setActiveCookie(await cookies(), profileId);
  revalidatePath("/app", "layout");
  return { ok: true, data: undefined };
}

// Free escolhe qual perfil único fica ativo. Liberado durante a graça, ou uma
// vez se ele nunca escolheu. Depois disso, trocar exige Pro.
export async function setKeptProfileAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const user = await requireUser();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  const { profileId } = parsed.data;

  const owned = await repos.profiles.listForUser(user.id);
  if (!owned.some((p) => p.id === profileId)) {
    return { ok: false, message: "Perfil não encontrado." };
  }

  const now = clock.now();
  if (!user.isPro) {
    const canChoose = isInGrace({ proGraceUntil: user.proGraceUntil, now }) || user.freeKeptProfileId === null;
    if (!canChoose) {
      return {
        ok: false,
        message: "No Free você usa um perfil. Pra trocar o ativo ou usar outro ao mesmo tempo, volte pro Pro.",
      };
    }
    await repos.users.update({ ...user, freeKeptProfileId: profileId, updatedAt: now });
  }

  setActiveCookie(await cookies(), profileId);
  revalidatePath("/app", "layout");
  return { ok: true, data: undefined };
}

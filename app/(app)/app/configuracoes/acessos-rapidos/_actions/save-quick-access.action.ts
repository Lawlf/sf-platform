"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateQuickAccess } from "@/application/use-cases/quick-access/update-quick-access.use-case";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { CATALOG_KEYS } from "../../../_components/quick-access/catalog";

const schema = z.array(z.string()).max(50); // cap defensivo de entrada; o use-case normaliza para 8

export async function saveQuickAccessAction(
  keys: string[],
): Promise<{ ok: boolean; keys?: string[] }> {
  const user = await requireUser();
  if (!user.isPro) return { ok: false }; // parede: só Pro edita

  const parsed = schema.safeParse(keys);
  if (!parsed.success) return { ok: false };

  const result = await updateQuickAccess(
    { users: new DrizzleUserRepository() },
    { user, keys: parsed.data, allowedKeys: CATALOG_KEYS, now: new Date() },
  );

  revalidatePath("/app");
  revalidatePath("/app/configuracoes/acessos-rapidos");
  return { ok: true, keys: result };
}

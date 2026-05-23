"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DrizzlePushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-push-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({
  endpoint: z.string().url(),
});

export async function unsubscribePushAction(input: {
  endpoint: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  const repo = new DrizzlePushSubscriptionRepository();
  const existing = await repo.findByEndpoint(parsed.data.endpoint);
  if (existing && existing.userId !== user.id) {
    return { ok: false, message: "Acesso negado." };
  }
  await repo.deleteByEndpoint(parsed.data.endpoint);
  revalidatePath("/app/perfil/notificacoes");
  return { ok: true };
}

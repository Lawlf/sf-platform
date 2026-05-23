"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DrizzlePushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-push-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const PUSH_HOST_ALLOWLIST = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "wns2-by3p.notify.windows.com",
];

function isAllowedPushEndpoint(endpointUrl: string): boolean {
  try {
    const u = new URL(endpointUrl);
    if (u.protocol !== "https:") return false;
    if (PUSH_HOST_ALLOWLIST.includes(u.hostname)) return true;
    // Mozilla rotates regional subdomains under autopush.services.mozilla.com etc.
    if (u.hostname.endsWith(".push.services.mozilla.com")) return true;
    if (u.hostname.endsWith(".notify.windows.com")) return true;
    if (u.hostname.endsWith(".push.apple.com")) return true;
    return false;
  } catch {
    return false;
  }
}

const schema = z.object({
  endpoint: z.string().url().refine(isAllowedPushEndpoint, {
    message: "Endpoint de push desconhecido.",
  }),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(200),
  userAgent: z.string().max(500).nullable().optional(),
});

export async function subscribePushAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  if (!user.isPro) {
    return { ok: false, message: "Notificações push são exclusivas do plano Pro." };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  const repo = new DrizzlePushSubscriptionRepository();
  const existing = await repo.findByEndpoint(parsed.data.endpoint);
  if (existing && existing.userId !== user.id) {
    // Prevent endpoint takeover: another user already owns this push channel.
    // The legitimate owner must explicitly unsubscribe before re-binding.
    return { ok: false, message: "Endpoint inválido." };
  }
  await repo.upsert({
    userId: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.p256dh,
    auth: parsed.data.auth,
    userAgent: parsed.data.userAgent ?? null,
  });
  revalidatePath("/app/perfil/notificacoes");
  return { ok: true };
}

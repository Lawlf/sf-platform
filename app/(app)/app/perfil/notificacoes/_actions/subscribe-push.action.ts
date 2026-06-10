"use server";

import { z } from "zod";

import { Forbidden } from "@/domain/errors/auth-errors";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
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

export const subscribePushAction = action({
  schema,
  revalidates: ["notificationPrefs"],
  handler: async (data, { userId }) => {
    const user = await requireUser();
    if (!user.isPro) {
      throw new Forbidden("Notificações push são exclusivas do plano Pro.");
    }
    const repo = repos.pushSubscriptions;
    const existing = await repo.findByEndpoint(data.endpoint);
    if (existing && existing.userId !== userId) {
      throw new Forbidden("Endpoint inválido.");
    }
    await repo.upsert({
      userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      userAgent: data.userAgent ?? null,
    });
    const deviceCount = (await repo.listForUser(userId)).length;
    return { deviceCount };
  },
});

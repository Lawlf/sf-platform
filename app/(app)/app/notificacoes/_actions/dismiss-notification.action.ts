"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dismissNotification } from "@/application/use-cases/notification/dismiss-notification.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleNotificationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors";

const schema = z.object({
  notificationId: z.string().uuid(),
});

export async function dismissNotificationAction(input: {
  notificationId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
  }
  const result = await dismissNotification(
    {
      notifications: new DrizzleNotificationRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, notificationId: parsed.data.notificationId },
  );
  if (isErr(result)) return { ok: false, message: result.error.message };
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";

import { markAllRead } from "@/application/use-cases/notification/mark-all-read.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await markAllRead(
    { notifications: repos.notifications, clock },
    { userId: user.id },
  );
  revalidatePath("/app");
  revalidatePath("/app/notificacoes");
  return { ok: true };
}

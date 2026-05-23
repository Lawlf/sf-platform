"use server";

import { countUndismissed } from "@/application/use-cases/notification/count-undismissed.use-case";
import { listNotifications } from "@/application/use-cases/notification/list-notifications.use-case";
import { DrizzleNotificationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

export interface SerializedNotification {
  id: string;
  kind: string;
  monthIso: string | null;
  triggeredAtIso: string;
  triggeredAtLabel: string;
  eyebrow: string;
  line: string;
  iconName: string;
  dismissed: boolean;
}

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export async function fetchNotifications(opts?: {
  onlyUndismissed?: boolean;
}): Promise<SerializedNotification[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const repo = new DrizzleNotificationRepository();
  const result = await listNotifications(
    { notifications: repo },
    opts?.onlyUndismissed === true
      ? { userId: user.id, onlyUndismissed: true }
      : { userId: user.id },
  );
  if (!isOk(result)) return [];
  return result.value.map((n) => ({
    id: n.id,
    kind: n.kind,
    monthIso: n.monthIso,
    triggeredAtIso: n.triggeredAt.toISOString(),
    triggeredAtLabel: DATE_FMT.format(n.triggeredAt),
    eyebrow: n.payload.eyebrow,
    line: n.payload.line,
    iconName: n.payload.iconName,
    dismissed: n.dismissedAt !== null,
  }));
}

export async function fetchUndismissedNotificationsCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const result = await countUndismissed(
    { notifications: new DrizzleNotificationRepository() },
    { userId: user.id },
  );
  return isOk(result) ? result.value : 0;
}

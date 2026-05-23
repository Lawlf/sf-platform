import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { ok, type Result } from "@/shared/errors";

export interface ListNotificationsDeps {
  notifications: NotificationRepository;
}

export interface ListNotificationsInput {
  userId: string;
  onlyUndismissed?: boolean;
}

/**
 * Lista notificacoes do usuario ordenadas por `triggeredAt` desc.
 * O repositorio Drizzle ja entrega ordenado, mas o use-case ordena
 * defensivamente caso outra implementacao seja injetada.
 */
export async function listNotifications(
  deps: ListNotificationsDeps,
  input: ListNotificationsInput,
): Promise<Result<NotificationEntity[], never>> {
  const opts =
    input.onlyUndismissed !== undefined ? { onlyUndismissed: input.onlyUndismissed } : undefined;
  const list = await deps.notifications.listForUser(input.userId, opts);
  const sorted = [...list].sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  return ok(sorted);
}

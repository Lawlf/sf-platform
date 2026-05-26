import { Forbidden } from "@/domain/errors/auth-errors";
import { NotificationNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface DismissNotificationDeps {
  notifications: NotificationRepository;
  clock: Clock;
}

export interface DismissNotificationInput {
  userId: string;
  notificationId: string;
}

/**
 * Soft delete LGPD-friendly: marca `dismissedAt` ao inves de remover a linha.
 * Idempotente: dispensar uma notificacao ja dispensada nao falha mas tambem
 * nao atualiza o timestamp (preserva a primeira dispensa do usuario).
 */
export async function dismissNotification(
  deps: DismissNotificationDeps,
  input: DismissNotificationInput,
): Promise<Result<void, NotificationNotFound | Forbidden>> {
  const existing = await deps.notifications.findById(input.notificationId);
  if (!existing) return err(new NotificationNotFound("Notificacao nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));
  if (existing.dismissedAt !== null) {
    return ok(undefined);
  }
  await deps.notifications.markDismissed(input.notificationId, deps.clock.now());
  return ok(undefined);
}

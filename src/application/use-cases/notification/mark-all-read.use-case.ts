import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface MarkAllReadDeps {
  notifications: NotificationRepositoryPort;
  clock: Clock;
}

export interface MarkAllReadInput {
  userId: string;
}

export async function markAllRead(
  deps: MarkAllReadDeps,
  input: MarkAllReadInput,
): Promise<Result<null, never>> {
  await deps.notifications.markAllReadForUser(input.userId, deps.clock.now());
  return ok(null);
}

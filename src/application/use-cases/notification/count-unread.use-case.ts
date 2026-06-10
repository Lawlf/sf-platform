import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface CountUnreadDeps {
  notifications: NotificationRepositoryPort;
}

export interface CountUnreadInput {
  userId: string;
}

export async function countUnread(
  deps: CountUnreadDeps,
  input: CountUnreadInput,
): Promise<Result<number, never>> {
  const count = await deps.notifications.countUnreadForUser(input.userId);
  return ok(count);
}

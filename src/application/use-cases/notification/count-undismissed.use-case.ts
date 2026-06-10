import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface CountUndismissedDeps {
  notifications: NotificationRepositoryPort;
}

export interface CountUndismissedInput {
  userId: string;
}

export async function countUndismissed(
  deps: CountUndismissedDeps,
  input: CountUndismissedInput,
): Promise<Result<number, never>> {
  const count = await deps.notifications.countUndismissedForUser(input.userId);
  return ok(count);
}

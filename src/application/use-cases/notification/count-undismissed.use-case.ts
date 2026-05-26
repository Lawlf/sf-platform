import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface CountUndismissedDeps {
  notifications: NotificationRepository;
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

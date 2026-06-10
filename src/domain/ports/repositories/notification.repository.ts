import type { NotificationEntity, NotificationKind } from "@/domain/entities/notification.entity";

export interface NotificationRepositoryPort {
  findById(id: string): Promise<NotificationEntity | null>;
  findByUserAndKindAndMonth(
    userId: string,
    kind: NotificationKind,
    monthIso: string | null,
  ): Promise<NotificationEntity | null>;
  listForUser(userId: string, opts?: { onlyUndismissed?: boolean }): Promise<NotificationEntity[]>;
  countUndismissedForUser(userId: string): Promise<number>;
  countUnreadForUser(userId: string): Promise<number>;
  create(entity: NotificationEntity): Promise<NotificationEntity>;
  markDismissed(id: string, dismissedAt: Date): Promise<void>;
  markAllReadForUser(userId: string, readAt: Date): Promise<void>;
}

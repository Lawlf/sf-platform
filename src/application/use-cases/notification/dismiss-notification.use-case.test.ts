import { describe, expect, it, vi } from "vitest";

import type { NotificationEntity } from "@/domain/entities/notification.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { NotificationNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { dismissNotification } from "./dismiss-notification.use-case";

function makeNotificationsRepo(): NotificationRepository {
  return {
    findById: vi.fn(),
    findByUserAndKindAndMonth: vi.fn(),
    listForUser: vi.fn(),
    countUndismissedForUser: vi.fn(),
    countUnreadForUser: vi.fn(),
    create: vi.fn(),
    markDismissed: vi.fn(),
    markAllReadForUser: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-21T10:00:00Z")): Clock {
  return { now: vi.fn(() => now) };
}

function makeExisting(overrides: Partial<NotificationEntity> = {}): NotificationEntity {
  return {
    id: "notif-1",
    userId: "user-1",
    kind: "negative_balance_month",
    monthIso: "2026-05",
    triggeredAt: new Date("2026-05-20T08:00:00Z"),
    payload: { eyebrow: "Atenção", line: "line", iconName: "AlertTriangle" },
    dismissedAt: null,
    readAt: null,
    createdAt: new Date("2026-05-20T08:00:00Z"),
    ...overrides,
  };
}

describe("dismissNotification", () => {
  it("marks the notification dismissed with clock.now() for the owner", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock(new Date("2026-05-21T10:00:00Z"));
    (notifications.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeExisting());

    const result = await dismissNotification(
      { notifications, clock },
      { userId: "user-1", notificationId: "notif-1" },
    );

    expect(isOk(result)).toBe(true);
    expect(notifications.markDismissed).toHaveBeenCalledTimes(1);
    expect(notifications.markDismissed).toHaveBeenCalledWith(
      "notif-1",
      new Date("2026-05-21T10:00:00Z"),
    );
  });

  it("returns Forbidden when caller does not own the notification", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock();
    (notifications.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExisting({ userId: "owner" }),
    );

    const result = await dismissNotification(
      { notifications, clock },
      { userId: "intruder", notificationId: "notif-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(notifications.markDismissed).not.toHaveBeenCalled();
  });

  it("returns NotificationNotFound when id does not exist", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock();
    (notifications.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await dismissNotification(
      { notifications, clock },
      { userId: "user-1", notificationId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(NotificationNotFound);
    }
    expect(notifications.markDismissed).not.toHaveBeenCalled();
  });

  it("is idempotent: does not re-mark when already dismissed", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock();
    (notifications.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExisting({ dismissedAt: new Date("2026-05-20T20:00:00Z") }),
    );

    const result = await dismissNotification(
      { notifications, clock },
      { userId: "user-1", notificationId: "notif-1" },
    );

    expect(isOk(result)).toBe(true);
    expect(notifications.markDismissed).not.toHaveBeenCalled();
  });
});

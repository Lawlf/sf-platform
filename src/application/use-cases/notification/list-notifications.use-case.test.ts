import { describe, expect, it, vi } from "vitest";

import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { isOk } from "@/shared/errors";

import { listNotifications } from "./list-notifications.use-case";

function makeNotificationsRepo(): NotificationRepository {
  return {
    findById: vi.fn(),
    findByUserAndKindAndMonth: vi.fn(),
    listForUser: vi.fn(),
    countUndismissedForUser: vi.fn(),
    create: vi.fn(),
    markDismissed: vi.fn(),
  };
}

function makeOne(
  id: string,
  triggeredAt: Date,
  dismissedAt: Date | null = null,
): NotificationEntity {
  return {
    id,
    userId: "user-1",
    kind: "negative_balance_month",
    monthIso: "2026-05",
    triggeredAt,
    payload: { eyebrow: "Atenção", line: "line", iconName: "AlertTriangle" },
    dismissedAt,
    createdAt: triggeredAt,
  };
}

describe("listNotifications", () => {
  it("returns notifications sorted by triggeredAt desc", async () => {
    const notifications = makeNotificationsRepo();
    const older = makeOne("n-old", new Date("2026-03-01T10:00:00Z"));
    const newer = makeOne("n-new", new Date("2026-05-21T10:00:00Z"));
    const middle = makeOne("n-mid", new Date("2026-04-15T10:00:00Z"));
    (notifications.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      older,
      newer,
      middle,
    ]);

    const result = await listNotifications({ notifications }, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.map((n) => n.id)).toEqual(["n-new", "n-mid", "n-old"]);
    }
    expect(notifications.listForUser).toHaveBeenCalledWith("user-1", undefined);
  });

  it("passes onlyUndismissed=true to the repository when requested", async () => {
    const notifications = makeNotificationsRepo();
    (notifications.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listNotifications({ notifications }, { userId: "user-1", onlyUndismissed: true });

    expect(notifications.listForUser).toHaveBeenCalledWith("user-1", { onlyUndismissed: true });
  });

  it("does not pass options when onlyUndismissed is omitted", async () => {
    const notifications = makeNotificationsRepo();
    (notifications.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listNotifications({ notifications }, { userId: "user-1" });

    expect(notifications.listForUser).toHaveBeenCalledWith("user-1", undefined);
  });
});

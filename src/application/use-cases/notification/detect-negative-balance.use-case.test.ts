import { describe, expect, it, vi } from "vitest";

import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { isOk } from "@/shared/errors";

import { detectNegativeBalance } from "./detect-negative-balance.use-case";

function makeNotificationsRepo(): NotificationRepository {
  return {
    findById: vi.fn(),
    findByUserAndKindAndMonth: vi.fn(),
    listForUser: vi.fn(),
    countUndismissedForUser: vi.fn(),
    create: vi.fn(async (entity) => entity),
    markDismissed: vi.fn(),
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
    triggeredAt: new Date("2026-05-21T10:00:00Z"),
    payload: { eyebrow: "Atenção", line: "old line", iconName: "AlertTriangle" },
    dismissedAt: null,
    createdAt: new Date("2026-05-21T10:00:00Z"),
    ...overrides,
  };
}

describe("detectNegativeBalance", () => {
  it("creates notification when freeBalance < 0 and none exists", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock(new Date("2026-05-21T10:00:00Z"));
    (notifications.findByUserAndKindAndMonth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await detectNegativeBalance(
      { notifications, clock },
      { userId: "user-1", monthIso: "2026-05", freeBalanceCents: -200_000n },
    );

    expect(isOk(result)).toBe(true);
    expect(notifications.create).toHaveBeenCalledTimes(1);
    const created = (notifications.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | NotificationEntity
      | undefined;
    expect(created).toBeDefined();
    expect(created?.userId).toBe("user-1");
    expect(created?.monthIso).toBe("2026-05");
    expect(created?.kind).toBe("negative_balance_month");
    expect(created?.payload.eyebrow).toBe("Atenção");
    expect(created?.payload.iconName).toBe("AlertTriangle");
    expect(created?.payload.line).toContain("saldo negativo");
    expect(created?.dismissedAt).toBeNull();
    expect(created?.triggeredAt).toEqual(new Date("2026-05-21T10:00:00Z"));
  });

  it("is idempotent: does not create when undismissed notification already exists for the month", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock();
    const existing = makeExisting();
    (notifications.findByUserAndKindAndMonth as ReturnType<typeof vi.fn>).mockResolvedValue(
      existing,
    );

    const result = await detectNegativeBalance(
      { notifications, clock },
      { userId: "user-1", monthIso: "2026-05", freeBalanceCents: -500_000n },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.created).toBe(false);
      expect(result.value.notification?.id).toBe(existing.id);
    }
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("respects dismissed notifications: does not recreate when user already dismissed for the same month", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock();
    const dismissed = makeExisting({ dismissedAt: new Date("2026-05-22T08:00:00Z") });
    (notifications.findByUserAndKindAndMonth as ReturnType<typeof vi.fn>).mockResolvedValue(
      dismissed,
    );

    const result = await detectNegativeBalance(
      { notifications, clock },
      { userId: "user-1", monthIso: "2026-05", freeBalanceCents: -700_000n },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.created).toBe(false);
    }
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("no-ops when freeBalance >= 0", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock();

    const result = await detectNegativeBalance(
      { notifications, clock },
      { userId: "user-1", monthIso: "2026-05", freeBalanceCents: 0n },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.created).toBe(false);
      expect(result.value.notification).toBeNull();
    }
    expect(notifications.findByUserAndKindAndMonth).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("uses caller-provided triggeredAt when present", async () => {
    const notifications = makeNotificationsRepo();
    const clock = makeClock(new Date("2026-05-21T10:00:00Z"));
    (notifications.findByUserAndKindAndMonth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const customTriggered = new Date("2026-05-15T12:34:56Z");
    await detectNegativeBalance(
      { notifications, clock },
      {
        userId: "user-1",
        monthIso: "2026-05",
        freeBalanceCents: -100n,
        triggeredAt: customTriggered,
      },
    );

    const created = (notifications.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | NotificationEntity
      | undefined;
    expect(created?.triggeredAt).toEqual(customTriggered);
    expect(created?.createdAt).toEqual(customTriggered);
  });
});

import { describe, expect, it, vi } from "vitest";

import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { isOk } from "@/shared/errors/result";

import { countUndismissed } from "./count-undismissed.use-case";

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

describe("countUndismissed", () => {
  it("returns the repository count for the user", async () => {
    const notifications = makeNotificationsRepo();
    (notifications.countUndismissedForUser as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    const result = await countUndismissed({ notifications }, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(3);
    }
    expect(notifications.countUndismissedForUser).toHaveBeenCalledWith("user-1");
  });

  it("returns zero when there are no undismissed notifications", async () => {
    const notifications = makeNotificationsRepo();
    (notifications.countUndismissedForUser as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const result = await countUndismissed({ notifications }, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(0);
    }
  });
});

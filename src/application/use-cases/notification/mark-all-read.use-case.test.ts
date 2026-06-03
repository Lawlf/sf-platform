import { describe, expect, it } from "vitest";

import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { isOk } from "@/shared/errors/result";

import { markAllRead } from "./mark-all-read.use-case";

describe("markAllRead", () => {
  it("chama markAllReadForUser com o userId e o now do clock", async () => {
    const calls: { userId: string; readAt: Date }[] = [];
    const now = new Date("2026-06-03T12:00:00Z");
    const notifications: NotificationRepository = {
      async findById() {
        return null;
      },
      async findByUserAndKindAndMonth() {
        return null;
      },
      async listForUser() {
        return [];
      },
      async countUndismissedForUser() {
        return 0;
      },
      async countUnreadForUser() {
        return 0;
      },
      async create(e) {
        return e;
      },
      async markDismissed() {},
      async markAllReadForUser(userId, readAt) {
        calls.push({ userId, readAt });
      },
    };
    const r = await markAllRead({ notifications, clock: { now: () => now } }, { userId: "u1" });
    expect(isOk(r)).toBe(true);
    expect(calls).toEqual([{ userId: "u1", readAt: now }]);
  });
});

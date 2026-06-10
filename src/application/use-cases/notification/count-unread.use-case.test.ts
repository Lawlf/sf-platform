import { describe, expect, it } from "vitest";

import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import { isOk } from "@/shared/errors/result";

import { countUnread } from "./count-unread.use-case";

function repoWithUnread(n: number): NotificationRepositoryPort {
  return {
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
      return n;
    },
    async create(e) {
      return e;
    },
    async markDismissed() {},
    async markAllReadForUser() {},
  };
}

describe("countUnread", () => {
  it("retorna a contagem de não lidas do repo", async () => {
    const r = await countUnread({ notifications: repoWithUnread(3) }, { userId: "u1" });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(3);
  });
});

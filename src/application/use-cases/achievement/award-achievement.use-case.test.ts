import { describe, expect, it, vi } from "vitest";

import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import type { UserAchievementRepositoryPort } from "@/domain/ports/repositories/user-achievement.repository";

import { awardAchievement } from "./award-achievement.use-case";

function fakes() {
  const unlocked = new Set<string>();
  const created: NotificationEntity[] = [];
  const userAchievements: UserAchievementRepositoryPort = {
    async unlock(userId, slug) {
      const key = `${userId}:${slug}`;
      if (unlocked.has(key)) return false;
      unlocked.add(key);
      return true;
    },
    async listForUser() {
      return [];
    },
    async hasUnlocked(userId, slug) {
      return unlocked.has(`${userId}:${slug}`);
    },
  };
  const notifications: NotificationRepositoryPort = {
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
    async create(entity) {
      created.push(entity);
      return entity;
    },
    async markDismissed() {},
    async markAllReadForUser() {},
  };
  return { userAchievements, notifications, created };
}

const clock = { now: () => new Date("2026-06-03T12:00:00Z") };
const isProFalse = async () => false;
const noopPush = vi.fn(async () => ({ delivered: 0 }));

describe("awardAchievement", () => {
  it("concede na primeira vez e cria notificação", async () => {
    const f = fakes();
    const r = await awardAchievement(
      { ...f, clock, isPro: isProFalse, sendPush: noopPush },
      { userId: "u1", slug: "quitacao" },
    );
    expect(r.awarded).toBe(true);
    expect(f.created).toHaveLength(1);
    expect(f.created[0]?.kind).toBe("achievement_unlocked");
    expect(f.created[0]?.payload.line).toBe("Dívida quitada");
  });

  it("é no-op na segunda vez (idempotente)", async () => {
    const f = fakes();
    const deps = { ...f, clock, isPro: isProFalse, sendPush: noopPush };
    await awardAchievement(deps, { userId: "u1", slug: "quitacao" });
    const r2 = await awardAchievement(deps, { userId: "u1", slug: "quitacao" });
    expect(r2.awarded).toBe(false);
    expect(f.created).toHaveLength(1);
  });

  it("não dispara push para usuário Free", async () => {
    const f = fakes();
    const push = vi.fn(async () => ({ delivered: 0 }));
    await awardAchievement(
      { ...f, clock, isPro: async () => false, sendPush: push },
      { userId: "u1", slug: "quitacao" },
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("dispara push para usuário Pro", async () => {
    const f = fakes();
    const push = vi.fn(async () => ({ delivered: 1 }));
    await awardAchievement(
      { ...f, clock, isPro: async () => true, sendPush: push },
      { userId: "u1", slug: "quitacao" },
    );
    expect(push).toHaveBeenCalledOnce();
  });

  it("ignora slug desconhecido sem quebrar", async () => {
    const f = fakes();
    const r = await awardAchievement(
      { ...f, clock, isPro: isProFalse, sendPush: noopPush },
      { userId: "u1", slug: "nao-existe" },
    );
    expect(r.awarded).toBe(false);
    expect(f.created).toHaveLength(0);
  });
});

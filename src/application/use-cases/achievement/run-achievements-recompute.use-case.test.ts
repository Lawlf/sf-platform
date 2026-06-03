import { describe, expect, it } from "vitest";

import type { AchievementProgressRepository } from "@/domain/ports/repositories/achievement-progress.repository";

import { runAchievementsRecompute } from "./run-achievements-recompute.use-case";

const clock = { now: () => new Date("2026-06-15T00:00:00Z") };
const noopProgress: AchievementProgressRepository = {
  async get() {
    return null;
  },
  async set() {},
};

describe("runAchievementsRecompute", () => {
  it("processa cada usuário ativo", async () => {
    const awarded: string[] = [];
    const reconciled: string[] = [];
    const result = await runAchievementsRecompute(
      {
        listRecentlyActiveUserIds: async () => ["u1", "u2"],
        listActiveMonthIsos: async () => ["2026-04", "2026-05", "2026-06"],
        progress: noopProgress,
        clock,
        award: async (userId, slug) => {
          awarded.push(`${userId}:${slug}`);
        },
        evaluate: async () => ({ saudeVerde: false, patrimonioPositivo: false, monthActive: true }),
        reconcileEvents: async (userId) => {
          reconciled.push(userId);
        },
      },
      clock.now(),
    );
    expect(result.usersProcessed).toBe(2);
    expect(reconciled).toEqual(["u1", "u2"]);
    expect(awarded).toContain("u1:check-in-3m");
    expect(awarded).toContain("u2:check-in-3m");
  });

  it("isola falha de um usuário e continua", async () => {
    const seen: string[] = [];
    const result = await runAchievementsRecompute(
      {
        listRecentlyActiveUserIds: async () => ["u1", "u2"],
        listActiveMonthIsos: async (userId) => {
          if (userId === "u1") throw new Error("boom");
          seen.push(userId);
          return ["2026-06"];
        },
        progress: noopProgress,
        clock,
        award: async () => {},
        evaluate: async () => ({ saudeVerde: false, patrimonioPositivo: false, monthActive: true }),
        reconcileEvents: async () => {},
      },
      clock.now(),
    );
    expect(result.usersProcessed).toBe(2);
    expect(seen).toEqual(["u2"]);
  });
});

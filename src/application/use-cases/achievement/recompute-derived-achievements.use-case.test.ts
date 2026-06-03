import { describe, expect, it } from "vitest";

import type {
  AchievementProgressRepository,
  AchievementProgressState,
} from "@/domain/ports/repositories/achievement-progress.repository";

import { recomputeDerivedAchievementsForUser } from "./recompute-derived-achievements.use-case";

function progressFake() {
  const store = new Map<string, AchievementProgressState>();
  const repo: AchievementProgressRepository = {
    async get(userId, slug) {
      return store.get(`${userId}:${slug}`) ?? null;
    },
    async set(userId, slug, state) {
      store.set(`${userId}:${slug}`, { ...state });
    },
  };
  return { repo, store };
}

const clock = { now: () => new Date("2026-06-15T00:00:00Z") };

describe("recomputeDerivedAchievementsForUser", () => {
  it("concede check-in-3m com 3 meses consecutivos", async () => {
    const awarded: string[] = [];
    const { repo } = progressFake();
    await recomputeDerivedAchievementsForUser(
      {
        progress: repo,
        clock,
        award: async (_u, slug) => {
          awarded.push(slug);
        },
        activeMonths: ["2026-04", "2026-05", "2026-06"],
        evaluate: async () => ({ saudeVerde: false, patrimonioPositivo: false, monthActive: true }),
      },
      "u1",
    );
    expect(awarded).toContain("check-in-3m");
    expect(awarded).not.toContain("check-in-6m");
  });

  it("concede jornada-12m com 12 meses distintos não consecutivos", async () => {
    const awarded: string[] = [];
    const { repo } = progressFake();
    const months = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}`);
    await recomputeDerivedAchievementsForUser(
      {
        progress: repo,
        clock,
        award: async (_u, slug) => {
          awarded.push(slug);
        },
        activeMonths: months,
        evaluate: async () => ({ saudeVerde: false, patrimonioPositivo: false, monthActive: true }),
      },
      "u1",
    );
    expect(awarded).toContain("jornada-12m");
  });

  it("sustained incrementa progresso e concede no 3º mês qualificado", async () => {
    const { repo, store } = progressFake();
    store.set("u1:saude-verde-3m", { qualifiedMonths: 2, lastQualifiedMonth: "2026-05" });
    const awarded: string[] = [];
    await recomputeDerivedAchievementsForUser(
      {
        progress: repo,
        clock,
        award: async (_u, slug) => {
          awarded.push(slug);
        },
        activeMonths: ["2026-06"],
        evaluate: async () => ({ saudeVerde: true, patrimonioPositivo: false, monthActive: true }),
      },
      "u1",
    );
    expect(awarded).toContain("saude-verde-3m");
    expect(store.get("u1:saude-verde-3m")?.qualifiedMonths).toBe(3);
  });

  it("sustained zera progresso quando mês não qualifica", async () => {
    const { repo, store } = progressFake();
    store.set("u1:saude-verde-3m", { qualifiedMonths: 2, lastQualifiedMonth: "2026-05" });
    const awarded: string[] = [];
    await recomputeDerivedAchievementsForUser(
      {
        progress: repo,
        clock,
        award: async (_u, slug) => {
          awarded.push(slug);
        },
        activeMonths: ["2026-06"],
        evaluate: async () => ({ saudeVerde: false, patrimonioPositivo: false, monthActive: true }),
      },
      "u1",
    );
    expect(awarded).not.toContain("saude-verde-3m");
    expect(store.get("u1:saude-verde-3m")?.qualifiedMonths).toBe(0);
  });

  it("sustained não conta o mesmo mês duas vezes", async () => {
    const { repo, store } = progressFake();
    store.set("u1:saude-verde-3m", { qualifiedMonths: 1, lastQualifiedMonth: "2026-06" });
    await recomputeDerivedAchievementsForUser(
      {
        progress: repo,
        clock,
        award: async () => {},
        activeMonths: ["2026-06"],
        evaluate: async () => ({ saudeVerde: true, patrimonioPositivo: false, monthActive: true }),
      },
      "u1",
    );
    expect(store.get("u1:saude-verde-3m")?.qualifiedMonths).toBe(1);
  });
});

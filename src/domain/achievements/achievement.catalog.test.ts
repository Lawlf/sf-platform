import { describe, expect, it } from "vitest";

import { ACHIEVEMENTS, achievementsByDetection, getAchievement } from "./achievement.catalog";

describe("achievement.catalog", () => {
  it("tem 13 conquistas com slugs únicos", () => {
    expect(ACHIEVEMENTS).toHaveLength(13);
    const slugs = new Set(ACHIEVEMENTS.map((a) => a.slug));
    expect(slugs.size).toBe(13);
  });

  it("getAchievement encontra por slug", () => {
    expect(getAchievement("quitacao")?.title).toBe("Dívida quitada");
    expect(getAchievement("inexistente")).toBeUndefined();
  });

  it("agrupa por tipo de detecção", () => {
    expect(achievementsByDetection("event")).toHaveLength(6);
    expect(achievementsByDetection("sustained")).toHaveLength(2);
    expect(achievementsByDetection("tenure")).toHaveLength(5);
  });
});

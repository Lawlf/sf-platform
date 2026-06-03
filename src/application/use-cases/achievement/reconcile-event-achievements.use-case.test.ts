import { describe, expect, it } from "vitest";

import { reconcileEventAchievements } from "./reconcile-event-achievements.use-case";

describe("reconcileEventAchievements", () => {
  it("concede só os slugs cujo estado é verdadeiro", async () => {
    const awarded: string[] = [];
    await reconcileEventAchievements(
      async (_u, slug) => {
        awarded.push(slug);
      },
      {
        hasDebt: true,
        hasAsset: false,
        hasIncome: true,
        hasGoal: false,
        hasPaidOffDebt: true,
      },
      "u1",
    );
    expect(awarded).toEqual(["primeiro-passo", "renda-a-vista", "quitacao"]);
  });

  it("não concede nada quando estado todo falso", async () => {
    const awarded: string[] = [];
    await reconcileEventAchievements(
      async (_u, slug) => {
        awarded.push(slug);
      },
      {
        hasDebt: false,
        hasAsset: false,
        hasIncome: false,
        hasGoal: false,
        hasPaidOffDebt: false,
      },
      "u1",
    );
    expect(awarded).toEqual([]);
  });

  it("nunca concede simulou-futuro (não backfillável)", async () => {
    const awarded: string[] = [];
    await reconcileEventAchievements(
      async (_u, slug) => {
        awarded.push(slug);
      },
      {
        hasDebt: true,
        hasAsset: true,
        hasIncome: true,
        hasGoal: true,
        hasPaidOffDebt: true,
      },
      "u1",
    );
    expect(awarded).not.toContain("simulou-futuro");
  });
});

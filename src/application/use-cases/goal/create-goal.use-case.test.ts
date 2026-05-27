import { describe, expect, it } from "vitest";

import { createGoal } from "./create-goal.use-case";

function repoWith(activeCount: number) {
  return {
    countActive: async () => activeCount,
    create: async (g: any) => ({ ...g, createdAt: new Date(), updatedAt: new Date() }),
  } as any;
}

describe("createGoal", () => {
  it("bloqueia 2a meta ativa para usuario Free", async () => {
    const r = await createGoal({ goals: repoWith(1) }, { userId: "u1", isPro: false, input: { type: "savings", title: "x", targetCents: 100n, fundingMode: "manual", manualSavedCents: 0n } as any });
    expect(r.ok).toBe(false);
  });
  it("permite multiplas metas para Pro", async () => {
    const r = await createGoal({ goals: repoWith(3) }, { userId: "u1", isPro: true, input: { type: "savings", title: "x", targetCents: 100n, fundingMode: "manual", manualSavedCents: 0n } as any });
    expect(r.ok).toBe(true);
  });
});

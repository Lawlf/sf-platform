import { describe, expect, it } from "vitest";

import { buildChecklistItems, allChecklistDone } from "./checklist-items";

const FULL = { hasIncome: true, hasDebt: true, hasAsset: true, hasGoal: true };
const EMPTY = { hasIncome: false, hasDebt: false, hasAsset: false, hasGoal: false };

describe("checklist-items", () => {
  it("returns the four items in order with done flags", () => {
    const items = buildChecklistItems({ ...EMPTY, hasIncome: true });
    expect(items.map((i) => i.key)).toEqual(["income", "debt", "asset", "goal"]);
    expect(items[0].done).toBe(true);
    expect(items[1].done).toBe(false);
    expect(items.every((i) => typeof i.label === "string" && i.href.startsWith("/app/"))).toBe(true);
  });

  it("allChecklistDone is true only when all four are done", () => {
    expect(allChecklistDone(FULL)).toBe(true);
    expect(allChecklistDone({ ...FULL, hasGoal: false })).toBe(false);
    expect(allChecklistDone(EMPTY)).toBe(false);
  });
});

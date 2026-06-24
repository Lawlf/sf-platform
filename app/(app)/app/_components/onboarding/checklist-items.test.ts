import { describe, expect, it } from "vitest";

import { allChecklistDone, buildChecklistItems } from "./checklist-items";

const EMPTY = {
  hasIncome: false,
  hasDebt: false,
  hasAsset: false,
  hasGoal: false,
  debtDismissed: false,
  goalDismissed: false,
};
const FULL = {
  hasIncome: true,
  hasDebt: true,
  hasAsset: true,
  hasGoal: true,
  debtDismissed: false,
  goalDismissed: false,
};

describe("checklist-items", () => {
  it("retorna os quatro itens em ordem com flags done e dismissible", () => {
    const items = buildChecklistItems({ ...EMPTY, hasIncome: true });
    expect(items.map((i) => i.key)).toEqual(["income", "debt", "asset", "goal"]);
    expect(items[0]!.done).toBe(true);
    expect(items[1]!.done).toBe(false);
    expect(items.find((i) => i.key === "debt")!.dismissible).toBe(true);
    expect(items.find((i) => i.key === "goal")!.dismissible).toBe(true);
    expect(items.find((i) => i.key === "income")!.dismissible).toBe(false);
    expect(items.find((i) => i.key === "asset")!.dismissible).toBe(false);
  });

  it("dívida e meta contam como feitas quando dispensadas", () => {
    const items = buildChecklistItems({ ...EMPTY, debtDismissed: true, goalDismissed: true });
    expect(items.find((i) => i.key === "debt")!.done).toBe(true);
    expect(items.find((i) => i.key === "goal")!.done).toBe(true);
  });

  it("allChecklistDone considera dispensa de dívida e meta", () => {
    expect(allChecklistDone(FULL)).toBe(true);
    expect(allChecklistDone(EMPTY)).toBe(false);
    expect(
      allChecklistDone({
        ...EMPTY,
        hasIncome: true,
        hasAsset: true,
        debtDismissed: true,
        goalDismissed: true,
      }),
    ).toBe(true);
    expect(allChecklistDone({ ...FULL, hasGoal: false, goalDismissed: true })).toBe(true);
  });
});

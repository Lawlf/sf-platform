import { describe, expect, it } from "vitest";

import { filterByLinkedAsset, filterByLinkedDebt } from "./linked-goals";

const mk = (linkedDebtId: string | null, linkedAssetId: string | null) => ({
  goal: { linkedDebtId, linkedAssetId },
});

describe("linked-goals filters", () => {
  it("filtra por divida", () => {
    const list = [mk("d1", null), mk("d2", null), mk(null, "a1")];
    expect(filterByLinkedDebt(list as never, "d1")).toHaveLength(1);
  });
  it("filtra por ativo", () => {
    const list = [mk(null, "a1"), mk("d1", null), mk(null, "a1")];
    expect(filterByLinkedAsset(list as never, "a1")).toHaveLength(2);
  });
});

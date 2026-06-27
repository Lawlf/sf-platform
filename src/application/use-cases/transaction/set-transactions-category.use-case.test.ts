import { describe, expect, it, vi } from "vitest";

import { isOk } from "@/shared/errors/result";

import { setTransactionsCategory } from "./set-transactions-category.use-case";

function makeDeps() {
  const calls: { profileId: string; ids: string[]; category: string | null }[] = [];
  return {
    calls,
    deps: {
      transactions: {
        setCategoryForIds: vi.fn(async (profileId: string, ids: string[], category: string | null) => {
          calls.push({ profileId, ids, category });
        }),
      },
    },
  };
}

describe("setTransactionsCategory", () => {
  it("aplica a categoria nos ids (dedup) e retorna a contagem", async () => {
    const { deps, calls } = makeDeps();
    const res = await setTransactionsCategory(deps, {
      profileId: "p1",
      transactionIds: ["a", "b", "a"],
      category: "alimentacao",
    });
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.value.count).toBe(2);
    expect(calls[0]).toEqual({ profileId: "p1", ids: ["a", "b"], category: "alimentacao" });
  });

  it("lista vazia: no-op", async () => {
    const { deps, calls } = makeDeps();
    const res = await setTransactionsCategory(deps, {
      profileId: "p1",
      transactionIds: [],
      category: null,
    });
    expect(isOk(res) && res.value.count).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

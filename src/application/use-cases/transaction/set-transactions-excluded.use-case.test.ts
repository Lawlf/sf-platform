import { describe, expect, it, vi } from "vitest";

import { isOk } from "@/shared/errors/result";

import { setTransactionsExcluded } from "./set-transactions-excluded.use-case";

function makeDeps() {
  const calls: { profileId: string; ids: string[]; excluded: boolean }[] = [];
  return {
    calls,
    deps: {
      transactions: {
        setExcludedForIds: vi.fn(async (profileId: string, ids: string[], excluded: boolean) => {
          calls.push({ profileId, ids, excluded });
        }),
      },
    },
  };
}

describe("setTransactionsExcluded", () => {
  it("marca não-contar nos ids (dedup) e retorna a contagem", async () => {
    const { deps, calls } = makeDeps();
    const res = await setTransactionsExcluded(deps, {
      profileId: "p1",
      transactionIds: ["a", "b", "b"],
      excluded: true,
    });
    expect(isOk(res) && res.value.count).toBe(2);
    expect(calls[0]).toEqual({ profileId: "p1", ids: ["a", "b"], excluded: true });
  });

  it("desmarca (voltar a contar)", async () => {
    const { deps, calls } = makeDeps();
    await setTransactionsExcluded(deps, { profileId: "p1", transactionIds: ["a"], excluded: false });
    expect(calls[0]!.excluded).toBe(false);
  });

  it("lista vazia: no-op", async () => {
    const { deps, calls } = makeDeps();
    const res = await setTransactionsExcluded(deps, {
      profileId: "p1",
      transactionIds: [],
      excluded: true,
    });
    expect(isOk(res) && res.value.count).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

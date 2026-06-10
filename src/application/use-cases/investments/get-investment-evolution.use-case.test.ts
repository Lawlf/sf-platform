import { describe, expect, it, vi } from "vitest";

import { getInvestmentEvolution } from "./get-investment-evolution.use-case";

const M = (s: string) => new Date(`${s}T00:00:00Z`);

describe("getInvestmentEvolution", () => {
  it("agrupa por mês e lista os tipos presentes", async () => {
    const snapshots = {
      replaceMonth: vi.fn(),
      listForUser: vi.fn(async () => [
        { userId: "u1", month: M("2026-05-01"), investmentType: "crypto", totalValueCents: 100n, capturedAt: M("2026-05-01") },
        { userId: "u1", month: M("2026-05-01"), investmentType: "fixed_income", totalValueCents: 200n, capturedAt: M("2026-05-01") },
        { userId: "u1", month: M("2026-06-01"), investmentType: "crypto", totalValueCents: 150n, capturedAt: M("2026-06-01") },
      ]),
    };
    const out = await getInvestmentEvolution({ snapshots: snapshots as never }, { userId: "u1" });
    expect(out.types).toEqual(["crypto", "fixed_income"]);
    expect(out.months).toEqual([
      { month: "2026-05", byType: { crypto: 100n, fixed_income: 200n } },
      { month: "2026-06", byType: { crypto: 150n, fixed_income: 0n } },
    ]);
  });

  it("retorna vazio quando não há snapshots", async () => {
    const snapshots = { replaceMonth: vi.fn(), listForUser: vi.fn(async () => []) };
    const out = await getInvestmentEvolution({ snapshots: snapshots as never }, { userId: "u1" });
    expect(out).toEqual({ types: [], months: [] });
  });
});

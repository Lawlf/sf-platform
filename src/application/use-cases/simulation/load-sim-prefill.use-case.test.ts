import { describe, expect, it, vi } from "vitest";

import { loadSimPrefill, type LoadSimPrefillDeps } from "./load-sim-prefill.use-case";

function emptyDeps(): LoadSimPrefillDeps {
  return {
    assets: { findActiveByUser: vi.fn(async () => []) },
    allocations: { findByAsset: vi.fn(async () => []) },
    debts: { listForUser: vi.fn(async () => []) },
    incomes: { listForUser: vi.fn(async () => []) },
    clock: { now: vi.fn(() => new Date("2026-06-03T12:00:00Z")) },
  } as unknown as LoadSimPrefillDeps;
}

describe("loadSimPrefill", () => {
  it("sem dados retorna tudo zero (string)", async () => {
    const r = await loadSimPrefill(emptyDeps(), { userId: "u1" });
    expect(r.investedCents).toBe("0");
    expect(r.cashReserveCents).toBe("0");
    expect(r.contributionCents).toBe("0");
    expect(r.incomeCents).toBe("0");
    expect(r.monthlyServiceCents).toBe("0");
  });

  it("usa os repos injetados (sem instanciar Drizzle)", async () => {
    const deps = emptyDeps();
    await loadSimPrefill(deps, { userId: "u1" });
    expect(deps.assets.findActiveByUser).toHaveBeenCalledWith("u1");
    expect(deps.incomes.listForUser).toHaveBeenCalledWith("u1", { onlyActive: true });
  });
});

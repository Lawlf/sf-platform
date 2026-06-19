import { describe, expect, it, vi } from "vitest";

import { loadSimPrefill, type LoadSimPrefillDeps } from "./load-sim-prefill.use-case";

function emptyDeps(): LoadSimPrefillDeps {
  return {
    assets: { findActiveByProfile: vi.fn(async () => []) },
    allocations: { findByAsset: vi.fn(async () => []) },
    debts: { listForProfile: vi.fn(async () => []) },
    incomes: { listForProfile: vi.fn(async () => []) },
    clock: { now: vi.fn(() => new Date("2026-06-03T12:00:00Z")) },
  } as unknown as LoadSimPrefillDeps;
}

describe("loadSimPrefill", () => {
  it("sem dados retorna tudo zero (string)", async () => {
    const r = await loadSimPrefill(emptyDeps(), { userId: "u1", profileId: "profile-1" });
    expect(r.investedCents).toBe("0");
    expect(r.cashReserveCents).toBe("0");
    expect(r.contributionCents).toBe("0");
    expect(r.incomeCents).toBe("0");
    expect(r.monthlyServiceCents).toBe("0");
  });

  it("usa os repos injetados (sem instanciar Drizzle)", async () => {
    const deps = emptyDeps();
    await loadSimPrefill(deps, { userId: "u1", profileId: "profile-1" });
    expect(deps.assets.findActiveByProfile).toHaveBeenCalledWith("profile-1");
    expect(deps.incomes.listForProfile).toHaveBeenCalledWith("profile-1", { onlyActive: true });
  });
});

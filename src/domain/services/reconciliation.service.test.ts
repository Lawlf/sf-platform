import { describe, expect, it } from "vitest";

import { ReconciliationService } from "./reconciliation.service";

describe("ReconciliationService.compute", () => {
  it("reports a leak when net worth grew less than the free cash flow", () => {
    const r = ReconciliationService.compute({
      theoreticalFreeCashFlowCents: 200000n,
      netWorthDeltaCents: 80000n,
    });
    expect(r.leakCents).toBe(120000n);
    expect(r.status).toBe("leaked");
  });

  it("reports ahead when net worth grew more than the free cash flow", () => {
    const r = ReconciliationService.compute({
      theoreticalFreeCashFlowCents: 100000n,
      netWorthDeltaCents: 150000n,
    });
    expect(r.leakCents).toBe(-50000n);
    expect(r.status).toBe("ahead");
  });

  it("reports on_track when they match", () => {
    const r = ReconciliationService.compute({
      theoreticalFreeCashFlowCents: 100000n,
      netWorthDeltaCents: 100000n,
    });
    expect(r.leakCents).toBe(0n);
    expect(r.status).toBe("on_track");
  });
});

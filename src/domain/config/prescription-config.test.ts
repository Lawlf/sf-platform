import { describe, expect, it } from "vitest";
import { PRESCRIPTION_CONFIG } from "./prescription-config";

describe("PRESCRIPTION_CONFIG", () => {
  it("defines expensive-debt monthly-rate threshold, reserve floor and min-safety in months", () => {
    expect(PRESCRIPTION_CONFIG.expensiveDebtMonthlyRate).toBeGreaterThan(0);
    expect(PRESCRIPTION_CONFIG.reserveFloorMonths).toBeGreaterThanOrEqual(
      PRESCRIPTION_CONFIG.minSafetyMonths,
    );
    expect(PRESCRIPTION_CONFIG.minSafetyMonths).toBeGreaterThan(0);
    expect(PRESCRIPTION_CONFIG.committedHeavyPct).toBe(50);
  });
});

import { describe, expect, it } from "vitest";

import { DEBT_RATE_ESTIMATES } from "./debt-rate-estimates";

describe("DEBT_RATE_ESTIMATES", () => {
  it("rotativo do cartao ~15% por mes, rotulado como estimativa", () => {
    const e = DEBT_RATE_ESTIMATES.creditCardRevolving;
    expect(e.valuePct).toBe(15);
    expect(e.unit).toBe("monthly");
    expect(e.label.toLowerCase()).toContain("estimativa");
    expect(e.note.length).toBeGreaterThan(10);
  });

  it("cheque especial = teto legal 8% por mes", () => {
    const e = DEBT_RATE_ESTIMATES.overdraft;
    expect(e.valuePct).toBe(8);
    expect(e.unit).toBe("monthly");
    expect(e.note.toLowerCase()).toContain("teto");
  });
});

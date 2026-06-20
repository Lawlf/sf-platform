import { describe, expect, it } from "vitest";

import { buildIncomeSeedQuery, parseIncomeSeed } from "./income-seed";

describe("income-seed com breakdown", () => {
  it("ida e volta carrega o breakdown serializado", () => {
    const breakdownJson = JSON.stringify({
      basis: "daily",
      lines: [{ count: 8, valuePerShiftCents: 60000 }],
    });
    const qs = buildIncomeSeedQuery({
      amountCents: "480000",
      frequency: "monthly",
      label: "Plantões",
      breakdownJson,
    });
    const seed = parseIncomeSeed(Object.fromEntries(new URLSearchParams(qs)));
    expect(seed?.breakdownJson).toBe(breakdownJson);
    expect(seed?.amountCents).toBe("480000");
  });

  it("seed sem breakdown segue válido", () => {
    const qs = buildIncomeSeedQuery({ amountCents: "1000", frequency: "monthly", label: "X" });
    const seed = parseIncomeSeed(Object.fromEntries(new URLSearchParams(qs)));
    expect(seed?.breakdownJson).toBeUndefined();
  });
});

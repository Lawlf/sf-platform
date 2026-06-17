import { describe, expect, it } from "vitest";

import { buildPaymentsView } from "./payments-view";

describe("buildPaymentsView", () => {
  it("quitada quando abateu tudo (saldo zero)", () => {
    const v = buildPaymentsView({
      originalCents: 298535n,
      currentCents: 0n,
      interestPortionsCents: [0n],
    });
    expect(v.hero).toEqual({ kind: "paidOff", abatedCents: 298535n });
    expect(v.collapsedByDefault).toBe(true);
  });

  it("parcial quando ainda falta saldo", () => {
    const v = buildPaymentsView({
      originalCents: 100000n,
      currentCents: 40000n,
      interestPortionsCents: [5000n, 3000n],
    });
    expect(v.hero).toEqual({
      kind: "partial",
      abatedCents: 60000n,
      originalCents: 100000n,
      currentCents: 40000n,
    });
    expect(v.totalInterestCents).toBe(8000n);
    expect(v.collapsedByDefault).toBe(false);
  });

  it("vazia quando nada foi abatido", () => {
    const v = buildPaymentsView({
      originalCents: 100000n,
      currentCents: 100000n,
      interestPortionsCents: [],
    });
    expect(v.hero).toEqual({ kind: "empty" });
    expect(v.totalInterestCents).toBe(0n);
  });

  it("soma juros mesmo quando parcial sem juros é zero", () => {
    const v = buildPaymentsView({
      originalCents: 100000n,
      currentCents: 50000n,
      interestPortionsCents: [0n, 0n],
    });
    expect(v.totalInterestCents).toBe(0n);
  });
});

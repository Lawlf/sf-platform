import { describe, expect, it } from "vitest";

import { Money } from "./money.vo";

describe("Money.convert", () => {
  it("converts to the target currency applying the rate", () => {
    const usd = Money.fromCents(10000n, "USD");
    const brl = usd.convert(5.01, "BRL");
    expect(brl.currency).toBe("BRL");
    expect(brl.toCents()).toBe(50100n);
  });

  it("uses banker's rounding on fractional cents", () => {
    const usd = Money.fromCents(101n, "USD");
    const brl = usd.convert(1.005, "BRL");
    expect(brl.toCents()).toBe(102n);
  });

  it("identity rate keeps the amount, changes only the label", () => {
    const brl = Money.fromCents(12345n, "BRL");
    expect(brl.convert(1, "BRL").toCents()).toBe(12345n);
  });

  it("rejects a non-finite or negative rate", () => {
    const usd = Money.fromCents(100n, "USD");
    expect(() => usd.convert(Number.NaN, "BRL")).toThrow();
    expect(() => usd.convert(-1, "BRL")).toThrow();
  });
});

import { describe, expect, it } from "vitest";

import { CURRENCIES, Money, type Currency } from "./money.vo";

describe("Currency", () => {
  it("CURRENCIES lists BRL plus the curated foreign set", () => {
    expect(CURRENCIES).toEqual(["BRL", "USD", "EUR", "GBP"]);
  });

  it("Money defaults to BRL when no currency is given", () => {
    expect(Money.zero().currency).toBe("BRL");
    expect(Money.fromCents(100n).currency).toBe("BRL");
  });

  it("Money accepts a non-BRL currency", () => {
    const usd: Currency = "USD";
    const m = Money.fromCents(100n, usd);
    expect(m.currency).toBe("USD");
  });

  it("refuses arithmetic across currencies", () => {
    const brl = Money.fromCents(100n, "BRL");
    const usd = Money.fromCents(100n, "USD");
    expect(() => brl.add(usd)).toThrow(/across currencies/);
  });
});

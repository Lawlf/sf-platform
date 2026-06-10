import { describe, expect, it } from "vitest";

import { coinIdForSymbol } from "./coingecko-coin-ids";

describe("coinIdForSymbol", () => {
  it("resolve símbolos conhecidos (case-insensitive, com espaço)", () => {
    expect(coinIdForSymbol("BTC")).toBe("bitcoin");
    expect(coinIdForSymbol(" eth ")).toBe("ethereum");
  });

  it("retorna null para símbolo desconhecido", () => {
    expect(coinIdForSymbol("NOPE")).toBeNull();
    expect(coinIdForSymbol("")).toBeNull();
  });
});

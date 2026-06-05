import { describe, expect, it } from "vitest";

import { BRAZILIAN_BANKS, filterBankOptions, normalizeBankQuery } from "./brazilian-banks";

describe("normalizeBankQuery", () => {
  it("remove acento e caixa", () => {
    expect(normalizeBankQuery("  Itaú ")).toBe("itau");
  });
});

describe("filterBankOptions", () => {
  it("'nub' sugere Nubank", () => {
    expect(filterBankOptions(BRAZILIAN_BANKS, "nub")).toContain("Nubank");
  });

  it("casa ignorando acento ('itau' -> Itaú)", () => {
    expect(filterBankOptions(BRAZILIAN_BANKS, "itau")).toContain("Itaú");
  });

  it("query vazia devolve todas", () => {
    expect(filterBankOptions(BRAZILIAN_BANKS, "")).toHaveLength(BRAZILIAN_BANKS.length);
  });

  it("casa dentro de rótulo composto", () => {
    const opts = BRAZILIAN_BANKS.map((b) => `Cartão ${b}`);
    expect(filterBankOptions(opts, "nub")).toContain("Cartão Nubank");
  });

  it("sem correspondência devolve vazio", () => {
    expect(filterBankOptions(BRAZILIAN_BANKS, "zzzzz")).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";

import { findInstrument } from "./instruments";
import { INVEST_OPTIONS, optionsForHorizon } from "./options";

describe("INVEST_OPTIONS", () => {
  it("toda opção aponta pra um instrumento existente em instruments.ts", () => {
    for (const o of INVEST_OPTIONS) {
      expect(findInstrument(o.detailName), o.key).toBeDefined();
    }
  });

  it("só opções 'a qualquer hora' têm número comparável (poupanca/cdb/tesouro)", () => {
    for (const o of INVEST_OPTIONS) {
      if (o.comparable) {
        expect(o.horizons).toContain("anytime");
      }
    }
    const anytime = optionsForHorizon("anytime");
    expect(anytime.map((o) => o.comparable).sort()).toEqual(["cdb", "poupanca", "tesouro"]);
  });

  it("optionsForHorizon filtra pelo prazo", () => {
    expect(optionsForHorizon("anytime").length).toBe(3);
    expect(optionsForHorizon("long").some((o) => o.key === "cripto")).toBe(true);
    expect(optionsForHorizon("long").some((o) => o.key === "poupanca")).toBe(false);
  });
});

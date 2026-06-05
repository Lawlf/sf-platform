import { afterEach, describe, expect, it, vi } from "vitest";

import { getMarketRates, parseSgsValue } from "./market-rates";

describe("parseSgsValue", () => {
  it("parseia valor com vírgula ou ponto", () => {
    expect(parseSgsValue([{ data: "01/06/2026", valor: "10,65" }])).toEqual({
      valor: 10.65,
      data: "01/06/2026",
    });
    expect(parseSgsValue([{ data: "01/06/2026", valor: "10.65" }])?.valor).toBe(10.65);
  });

  it("retorna null pra resposta vazia ou inválida", () => {
    expect(parseSgsValue([])).toBeNull();
    expect(parseSgsValue(null)).toBeNull();
    expect(parseSgsValue([{ data: "x", valor: "abc" }])).toBeNull();
  });
});

describe("getMarketRates", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa fallback (live=false) quando o fetch falha", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network");
    }));
    const r = await getMarketRates();
    expect(r.live).toBe(false);
    expect(r.cdiAnnualPct).toBeGreaterThan(0);
  });

  it("usa dado ao vivo quando o Bacen responde", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ data: "01/06/2026", valor: "11,25" }],
      })),
    );
    const r = await getMarketRates();
    expect(r.live).toBe(true);
    expect(r.cdiAnnualPct).toBe(11.25);
    expect(r.asOf).toBe("01/06/2026");
  });
});

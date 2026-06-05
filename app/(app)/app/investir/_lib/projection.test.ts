import { describe, expect, it } from "vitest";

import { earlyWithdrawalSamples, earlyWithdrawalSeries, projectSeries } from "./projection";

describe("projectSeries", () => {
  it("gera 12 pontos crescentes pro CDB", () => {
    const p = projectSeries({ amountCents: 500000n, product: "cdb", cdiAnnualPct: 10.5 });
    expect(p.points).toHaveLength(12);
    expect(p.points[0]!.month).toBe(1);
    expect(p.points[11]!.month).toBe(12);
    expect(p.points[11]!.finalCents).toBeGreaterThan(p.points[0]!.finalCents);
    expect(p.points[0]!.finalCents).toBeGreaterThanOrEqual(500000n);
  });

  it("ponto final bate com o breakdown de 12 meses", () => {
    const p = projectSeries({ amountCents: 500000n, product: "tesouro", cdiAnnualPct: 10.5 });
    expect(p.points[11]!.finalCents).toBe(p.final.finalCents);
  });

  it("poupança é isenta (taxCents 0)", () => {
    const p = projectSeries({ amountCents: 500000n, product: "poupanca", cdiAnnualPct: 10.5 });
    expect(p.final.taxCents).toBe(0n);
  });
});

describe("earlyWithdrawalSamples", () => {
  it("CDB: IOF morde antes de 30 dias e zera no dia 30", () => {
    const s = earlyWithdrawalSamples({ amountCents: 500000n, product: "cdb", cdiAnnualPct: 10.5 });
    const d10 = s.find((x) => x.day === 10)!;
    const d30 = s.find((x) => x.day === 30)!;
    expect(d10.iofCents).toBeGreaterThan(0n);
    expect(d30.iofCents).toBe(0n);
    expect(d10.netCents).toBeLessThan(d10.grossCents);
  });

  it("poupança não entra (outra regra)", () => {
    expect(
      earlyWithdrawalSamples({ amountCents: 500000n, product: "poupanca", cdiAnnualPct: 10.5 }),
    ).toEqual([]);
  });
});

describe("earlyWithdrawalSeries", () => {
  it("CDB: 30 dias, líquido cresce e IOF zera no dia 30", () => {
    const s = earlyWithdrawalSeries({ amountCents: 500000n, product: "cdb", cdiAnnualPct: 10.5 });
    expect(s).toHaveLength(30);
    expect(s[0]!.day).toBe(1);
    expect(s[29]!.day).toBe(30);
    expect(s[29]!.iofCents).toBe(0n);
    expect(s[29]!.netCents).toBeGreaterThan(s[0]!.netCents);
  });

  it("poupança retorna vazio", () => {
    expect(earlyWithdrawalSeries({ amountCents: 500000n, product: "poupanca", cdiAnnualPct: 10.5 })).toEqual(
      [],
    );
  });
});

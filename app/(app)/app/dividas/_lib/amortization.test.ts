import { describe, expect, it } from "vitest";

import { computePriceInstallmentCents, solveAnnualRatePct } from "./amortization";

describe("solveAnnualRatePct", () => {
  it("recupera a taxa que gera uma parcela conhecida (ida e volta)", () => {
    const principal = 1_000_000n;
    const term = 24;
    const annual = 30;
    const inst = computePriceInstallmentCents(principal, annual, term)!;
    const solved = solveAnnualRatePct(principal, inst, term)!;
    expect(solved).toBeGreaterThan(29);
    expect(solved).toBeLessThan(31);
  });

  it("parcela = principal/term => taxa exatamente 0% (sem resíduo numérico)", () => {
    const principal = 1_200_000n;
    const term = 12;
    const inst = principal / BigInt(term);
    const solved = solveAnnualRatePct(principal, inst, term)!;
    expect(solved).toBe(0);
  });

  it("entradas invalidas retornam null", () => {
    expect(solveAnnualRatePct(0n, 100n, 12)).toBeNull();
    expect(solveAnnualRatePct(100n, 0n, 12)).toBeNull();
    expect(solveAnnualRatePct(100n, 100n, 0)).toBeNull();
  });

  it("parcela impossivelmente baixa (< principal/term) retorna null", () => {
    expect(solveAnnualRatePct(1_200_000n, 50_000n, 12)).toBeNull();
  });
});

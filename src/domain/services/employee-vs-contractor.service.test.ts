import { describe, expect, it } from "vitest";

import { EmployeeVsContractorService } from "./employee-vs-contractor.service";

const BASE = {
  dependents: 0,
  includeCltBenefits: false,
  meiActivity: "servicos" as const,
  anexo: "auto" as const,
  proLaboreCents: 0n,
  accountantCents: 0n,
  businessCostsCents: 0n,
};

describe("EmployeeVsContractorService.compute", () => {
  it("MEI: subtracts the fixed DAS from revenue", () => {
    const r = EmployeeVsContractorService.compute({
      ...BASE,
      cltGrossCents: 3_000_00n,
      pjRevenueCents: 5_000_00n,
      pjRegime: "mei",
    });
    expect(Number(r.pj.dasCents) / 100).toBeCloseTo(80.9, 2); // serviços
    expect(r.pj.overMeiLimit).toBe(false);
    expect(Number(r.pj.netCents) / 100).toBeCloseTo(4919.1, 1);
    expect(Number(r.cltCompareCents) / 100).toBeCloseTo(2733.39, 1);
    expect(r.recommendation).toBe("pj");
  });

  it("MEI: flags when revenue exceeds the annual ceiling", () => {
    const r = EmployeeVsContractorService.compute({
      ...BASE,
      cltGrossCents: 3_000_00n,
      pjRevenueCents: 8_000_00n, // 96k/ano > 81k
      pjRegime: "mei",
    });
    expect(r.pj.overMeiLimit).toBe(true);
  });

  it("Simples: a pró-labore at/above 28% picks Anexo III (cheaper)", () => {
    const r = EmployeeVsContractorService.compute({
      ...BASE,
      cltGrossCents: 5_000_00n,
      pjRevenueCents: 10_000_00n,
      pjRegime: "simples",
      proLaboreCents: 3_000_00n, // fator R 0,30 >= 0,28
      accountantCents: 200_00n,
    });
    expect(r.pj.anexoUsed).toBe("III");
    expect(r.pj.fatorR).toBeCloseTo(0.3, 4);
    expect(Number(r.pj.dasCents) / 100).toBeCloseTo(600, 1); // 6% de 10.000
    expect(Number(r.pj.proLaboreInssCents) / 100).toBeCloseTo(330, 1); // 11% de 3.000
    expect(Number(r.pj.netCents) / 100).toBeCloseTo(8856.8, 0);
    expect(r.recommendation).toBe("pj");
  });

  it("Simples: a low pró-labore falls into Anexo V (more expensive)", () => {
    const r = EmployeeVsContractorService.compute({
      ...BASE,
      cltGrossCents: 5_000_00n,
      pjRevenueCents: 10_000_00n,
      pjRegime: "simples",
      proLaboreCents: 1_000_00n, // fator R 0,10 < 0,28
    });
    expect(r.pj.anexoUsed).toBe("V");
    expect(Number(r.pj.dasCents) / 100).toBeCloseTo(1550, 1); // 15,5% de 10.000
  });

  it("subtracts business costs from the PJ net (revenue is not profit)", () => {
    const noCost = EmployeeVsContractorService.compute({
      ...BASE,
      cltGrossCents: 3_000_00n,
      pjRevenueCents: 6_000_00n,
      pjRegime: "mei",
    });
    const withCost = EmployeeVsContractorService.compute({
      ...BASE,
      cltGrossCents: 3_000_00n,
      pjRevenueCents: 6_000_00n,
      pjRegime: "mei",
      businessCostsCents: 2_000_00n,
    });
    expect(Number(withCost.pj.businessCostsCents) / 100).toBeCloseTo(2000, 2);
    // custos derrubam o líquido em exatamente o custo
    expect(Number(noCost.pj.netCents) - Number(withCost.pj.netCents)).toBe(2_000_00);
  });

  it("includeCltBenefits raises the CLT comparison value", () => {
    const r = EmployeeVsContractorService.compute({
      ...BASE,
      includeCltBenefits: true,
      cltGrossCents: 3_000_00n,
      pjRevenueCents: 5_000_00n,
      pjRegime: "mei",
    });
    // 2733,39 + 3000*(0,08+1/12+1/36) = 2733,39 + 573,33 = 3306,72
    expect(Number(r.clt.withBenefitsCents) / 100).toBeCloseTo(3306.72, 0);
    expect(Number(r.cltCompareCents) / 100).toBeCloseTo(3306.72, 0);
  });
});

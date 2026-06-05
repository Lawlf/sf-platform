import { describe, expect, it } from "vitest";

import { SIMULATORS } from "../../../(app)/app/simular/_lib/simulators";

import {
  PUBLIC_CALCULATORS,
  getPublicCalculator,
  publicCalculatorSlugs,
} from "./public-calculators";

describe("public-calculators registry", () => {
  it("retorna a calculadora de salário líquido CLT pelo slug", () => {
    const calc = getPublicCalculator("salario-liquido-clt");
    expect(calc).toBeDefined();
    expect(calc?.h1).toMatch(/salário líquido/i);
    expect(calc?.seoTitle.length).toBeGreaterThan(0);
    expect(calc?.seoDescription.length).toBeGreaterThan(0);
    expect(calc?.faq.length).toBeGreaterThan(0);
  });

  it("retorna undefined para slug inexistente", () => {
    expect(getPublicCalculator("nao-existe")).toBeUndefined();
  });

  it("lista os slugs públicos para sitemap e static params", () => {
    expect(publicCalculatorSlugs()).toContain("salario-liquido-clt");
  });

  it("não tem slugs duplicados", () => {
    const slugs = publicCalculatorSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("cada calculadora aponta para um simulador real do registry interno", () => {
    const validIds = new Set(SIMULATORS.map((s) => s.id));
    for (const calc of PUBLIC_CALCULATORS) {
      expect(validIds.has(calc.simId)).toBe(true);
    }
  });
});

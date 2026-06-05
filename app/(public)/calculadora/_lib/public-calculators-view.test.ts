import { describe, expect, it } from "vitest";

import {
  publicCalculatorsByCategory,
  searchPublicCalculators,
} from "./public-calculators-view";

describe("publicCalculatorsByCategory", () => {
  it("agrupa a calculadora de salário CLT na categoria trabalho", () => {
    const groups = publicCalculatorsByCategory();
    const trabalho = groups.find((g) => g.id === "trabalho");
    expect(trabalho).toBeDefined();
    const item = trabalho?.items.find((i) => i.slug === "salario-liquido-clt");
    expect(item).toBeDefined();
    expect(item?.title.length).toBeGreaterThan(0);
    expect(item?.Icon).toBeTruthy();
  });

  it("só retorna categorias que têm ao menos uma calculadora pública", () => {
    const groups = publicCalculatorsByCategory();
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });
});

describe("searchPublicCalculators", () => {
  it("acha por palavra-chave do simulador (acento e caixa ignorados)", () => {
    const results = searchPublicCalculators("INSS");
    expect(results.some((r) => r.slug === "salario-liquido-clt")).toBe(true);
  });

  it("acha por termo no título", () => {
    const results = searchPublicCalculators("reserva");
    expect(results.some((r) => r.slug === "reserva-de-emergencia")).toBe(true);
  });

  it("retorna vazio para busca em branco", () => {
    expect(searchPublicCalculators("   ")).toEqual([]);
  });

  it("retorna vazio quando nada casa", () => {
    expect(searchPublicCalculators("zzzxyz")).toEqual([]);
  });
});

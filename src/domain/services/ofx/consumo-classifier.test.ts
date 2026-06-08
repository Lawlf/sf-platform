import { describe, expect, it } from "vitest";

import { classifyConsumo } from "./consumo-classifier";

describe("classifyConsumo", () => {
  it("classifies installment memos as parcelado", () => {
    expect(classifyConsumo("PARCELA 3/12 LOJA X")).toBe("parcelado");
    expect(classifyConsumo("Compra parcelada Magalu")).toBe("parcelado");
  });

  it("classifies essential merchants as essencial", () => {
    expect(classifyConsumo("Supermercado Pao de Acucar")).toBe("essencial");
    expect(classifyConsumo("DROGARIA SP")).toBe("essencial");
    expect(classifyConsumo("Posto Shell combustivel")).toBe("essencial");
    expect(classifyConsumo("Enel energia")).toBe("essencial");
    expect(classifyConsumo("UBER *TRIP")).toBe("essencial");
  });

  it("falls back to resto for anything else", () => {
    expect(classifyConsumo("iFood")).toBe("resto");
    expect(classifyConsumo("Spotify")).toBe("resto");
    expect(classifyConsumo("Compra no debito")).toBe("resto");
  });
});

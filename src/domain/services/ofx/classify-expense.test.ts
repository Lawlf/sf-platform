import { describe, expect, it } from "vitest";

import { classifyExpense } from "./classify-expense";

describe("classifyExpense", () => {
  it("classifies grocery memos as Mercado", () => {
    expect(classifyExpense("SUPERMERCADO EXTRA")).toBe("Mercado");
    expect(classifyExpense("Compra padaria do bairro")).toBe("Mercado");
  });

  it("classifies food delivery and restaurants as Alimentação", () => {
    expect(classifyExpense("IFOOD *RESTAURANTE")).toBe("Alimentação");
    expect(classifyExpense("Pagamento Rappi")).toBe("Alimentação");
  });

  it("classifies ride and fuel memos as Transporte", () => {
    expect(classifyExpense("UBER *TRIP")).toBe("Transporte");
    expect(classifyExpense("POSTO IPIRANGA")).toBe("Transporte");
  });

  it("classifies utilities and rent as Moradia", () => {
    expect(classifyExpense("ALUGUEL APTO")).toBe("Moradia");
    expect(classifyExpense("ENEL DISTRIBUICAO")).toBe("Moradia");
  });

  it("classifies pharmacy and clinics as Saúde", () => {
    expect(classifyExpense("DROGARIA SAO PAULO")).toBe("Saúde");
    expect(classifyExpense("CLINICA ODONTO")).toBe("Saúde");
  });

  it("classifies retail as Compras", () => {
    expect(classifyExpense("AMAZON BR")).toBe("Compras");
    expect(classifyExpense("LOJAS RENNER")).toBe("Compras");
  });

  it("classifies streaming and travel as Lazer", () => {
    expect(classifyExpense("NETFLIX.COM")).toBe("Lazer");
    expect(classifyExpense("AIRBNB * STAY")).toBe("Lazer");
  });

  it("falls back to Outros for unknown memos", () => {
    expect(classifyExpense("PIX ENVIADO JOAO")).toBe("Outros");
    expect(classifyExpense("xyz123")).toBe("Outros");
  });
});

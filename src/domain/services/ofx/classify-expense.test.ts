import { describe, expect, it } from "vitest";

import { classifyExpense } from "./classify-expense";

describe("classifyExpense", () => {
  it("classifies grocery memos as mercado", () => {
    expect(classifyExpense("SUPERMERCADO EXTRA")).toBe("mercado");
    expect(classifyExpense("Compra padaria do bairro")).toBe("mercado");
  });

  it("classifies food delivery and restaurants as alimentacao", () => {
    expect(classifyExpense("IFOOD *RESTAURANTE")).toBe("alimentacao");
    expect(classifyExpense("Pagamento Rappi")).toBe("alimentacao");
  });

  it("classifies ride and fuel memos as transporte", () => {
    expect(classifyExpense("UBER *TRIP")).toBe("transporte");
    expect(classifyExpense("POSTO IPIRANGA")).toBe("transporte");
  });

  it("classifies utilities and rent as moradia", () => {
    expect(classifyExpense("ALUGUEL APTO")).toBe("moradia");
    expect(classifyExpense("ENEL DISTRIBUICAO")).toBe("moradia");
  });

  it("classifies pharmacy and clinics as saude", () => {
    expect(classifyExpense("DROGARIA SAO PAULO")).toBe("saude");
    expect(classifyExpense("CLINICA ODONTO")).toBe("saude");
  });

  it("classifies retail as compras", () => {
    expect(classifyExpense("AMAZON BR")).toBe("compras");
    expect(classifyExpense("LOJAS RENNER")).toBe("compras");
  });

  it("classifies streaming and travel as lazer", () => {
    expect(classifyExpense("NETFLIX.COM")).toBe("lazer");
    expect(classifyExpense("AIRBNB * STAY")).toBe("lazer");
  });

  it("classifies recurring services as assinaturas", () => {
    expect(classifyExpense("ASSINATURA REVISTA")).toBe("assinaturas");
    expect(classifyExpense("MENSALIDADE CLUBE")).toBe("assinaturas");
  });

  it("classifies fees and insurance as contas", () => {
    expect(classifyExpense("TARIFA PACOTE SERVICOS")).toBe("contas");
    expect(classifyExpense("SEGURO AUTO")).toBe("contas");
  });

  it("falls back to outros for unknown memos", () => {
    expect(classifyExpense("PIX ENVIADO JOAO")).toBe("outros");
    expect(classifyExpense("xyz123")).toBe("outros");
  });
});

import { describe, expect, it } from "vitest";

import { moveCtaFor } from "./move-cta";

describe("moveCtaFor", () => {
  it("pay_debt com targetDebtId -> deep-link de meta de quitacao", () => {
    const cta = moveCtaFor({ type: "pay_debt", targetDebtId: "d1" });
    expect(cta).toEqual({
      label: "Criar meta de quitar essa dívida",
      href: "/app/metas/nova?from=sim&type=debt_payoff&debtId=d1",
    });
  });
  it("pay_debt sem targetDebtId -> null", () => {
    expect(moveCtaFor({ type: "pay_debt", targetDebtId: null })).toBeNull();
  });
  it("build_reserve -> simulador de reserva", () => {
    expect(moveCtaFor({ type: "build_reserve" })).toEqual({
      label: "Simular minha reserva",
      href: "/app/simular/reserva",
    });
  });
  it("invest -> guia onde investir", () => {
    expect(moveCtaFor({ type: "invest" })).toEqual({
      label: "Onde investir",
      href: "/app/investir",
    });
  });
  it("reduce_commitment -> dividas", () => {
    expect(moveCtaFor({ type: "reduce_commitment" })).toEqual({
      label: "Revisar minhas dívidas",
      href: "/app/dividas",
    });
  });
});

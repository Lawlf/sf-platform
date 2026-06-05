import { describe, expect, it } from "vitest";

import { homeCardOrder, resolveHomeState } from "./home-layout";

describe("resolveHomeState", () => {
  it("dívida vence sempre, independente do estado da prescrição", () => {
    expect(resolveHomeState({ hasDebt: true, prescriptionState: "ready_to_grow" })).toBe("com_divida");
    expect(resolveHomeState({ hasDebt: true, prescriptionState: "no_cushion" })).toBe("com_divida");
    expect(resolveHomeState({ hasDebt: true, prescriptionState: "tight" })).toBe("com_divida");
  });

  it("sem dívida + ready_to_grow => com_patrimonio", () => {
    expect(resolveHomeState({ hasDebt: false, prescriptionState: "ready_to_grow" })).toBe(
      "com_patrimonio",
    );
  });

  it("sem dívida + no_cushion/tight => sem_reserva", () => {
    expect(resolveHomeState({ hasDebt: false, prescriptionState: "no_cushion" })).toBe("sem_reserva");
    expect(resolveHomeState({ hasDebt: false, prescriptionState: "tight" })).toBe("sem_reserva");
  });
});

describe("homeCardOrder", () => {
  it("projeção só aparece no estado com_patrimonio", () => {
    expect(homeCardOrder("com_divida")).not.toContain("projection");
    expect(homeCardOrder("sem_reserva")).not.toContain("projection");
    expect(homeCardOrder("com_patrimonio")).toContain("projection");
  });

  it("ordem-base estável: hero, acessos, movimento no topo em todos os estados", () => {
    for (const st of ["com_divida", "sem_reserva", "com_patrimonio"] as const) {
      const order = homeCardOrder(st);
      expect(order[0]).toBe("hero");
      expect(order[1]).toBe("quickAccess");
      expect(order[2]).toBe("nextStep");
    }
  });

  it("sem_reserva: goal promovida acima de commitment (a reserva é a meta)", () => {
    const order = homeCardOrder("sem_reserva");
    expect(order.indexOf("goal")).toBeLessThan(order.indexOf("commitment"));
  });

  it("com_patrimonio: projeção logo após a saúde, antes de metas", () => {
    const order = homeCardOrder("com_patrimonio");
    expect(order.indexOf("projection")).toBeGreaterThan(order.indexOf("commitment"));
    expect(order.indexOf("projection")).toBeLessThan(order.indexOf("goal"));
  });

  it("manutenção e mais sempre no rodapé", () => {
    for (const st of ["com_divida", "sem_reserva", "com_patrimonio"] as const) {
      const order = homeCardOrder(st);
      expect(order.slice(-2)).toEqual(["maintenance", "mais"]);
    }
  });
});

import { describe, expect, it } from "vitest";

import { daysUntilNextMonth, nextMonthFloorCents, resolveMonthClose } from "./month-close";

const baseIncome = (over: Partial<{ dateIso: string; settledStatus: "received" | "not_received" | "adjusted" | null }> = {}) => ({
  dateIso: "2026-06-05T00:00:00.000Z",
  settledStatus: null as "received" | "not_received" | "adjusted" | null,
  ...over,
});

describe("resolveMonthClose", () => {
  it("não fecha nem oferece ponte quando não está flat", () => {
    const r = resolveMonthClose({
      flat: false,
      positive: true,
      incomes: [baseIncome({ settledStatus: "received" })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-23",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showBridge).toBe(false);
    expect(r.showCelebration).toBe(false);
  });

  it("base vazia (nada realizado) nunca fecha nem oferece ponte, mesmo flat", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [baseIncome({ dateIso: "2026-06-28T00:00:00.000Z", settledStatus: "received" })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-23",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showBridge).toBe(false);
    expect(r.showCelebration).toBe(false);
  });

  it("flat + base não-vazia oferece ponte, mas não celebra no meio do mês sem renda confirmada", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [baseIncome({ settledStatus: null })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-23",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showBridge).toBe(true);
    expect(r.showCelebration).toBe(false);
  });

  it("caminho nobre: flat + base + toda renda confirmada celebra cedo", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [baseIncome({ settledStatus: "received" }), baseIncome({ settledStatus: "adjusted" })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-23",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showCelebration).toBe(true);
    expect(r.celebratePositive).toBe(true);
  });

  it("renda não toda confirmada bloqueia o caminho nobre", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [baseIncome({ settledStatus: "received" }), baseIncome({ settledStatus: null })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-23",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showCelebration).toBe(false);
  });

  it("rede de segurança: últimos 3 dias celebram mesmo sem renda confirmada (junho=30d -> dia>=28)", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: false,
      incomes: [baseIncome({ settledStatus: null })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-28",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showCelebration).toBe(true);
    expect(r.celebratePositive).toBe(false);
  });

  it("rede de segurança bloqueada quando há renda variável pendente nos últimos 3 dias", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [baseIncome({ settledStatus: null })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-28",
      hasPendingEstimatedIncome: true,
    });
    expect(r.showCelebration).toBe(false);
    expect(r.showBridge).toBe(true);
  });

  it("caminho nobre celebra mesmo com hasPendingEstimatedIncome=true quando toda renda está confirmada", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [baseIncome({ settledStatus: "received" }), baseIncome({ settledStatus: "adjusted" })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-28",
      hasPendingEstimatedIncome: true,
    });
    expect(r.showCelebration).toBe(true);
  });

  it("dia 27 de junho ainda não está nos últimos 3 dias", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [baseIncome({ settledStatus: null })],
      expenses: [],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-27",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showCelebration).toBe(false);
  });

  it("base pode vir de gasto/pagamento realizado, não só renda", () => {
    const r = resolveMonthClose({
      flat: true,
      positive: true,
      incomes: [],
      expenses: [{ dateIso: "2026-06-10T00:00:00.000Z" }],
      payments: [],
      monthIso: "2026-06",
      todayIso: "2026-06-23",
      hasPendingEstimatedIncome: false,
    });
    expect(r.showBridge).toBe(true);
  });
});

describe("daysUntilNextMonth", () => {
  it("conta os dias até o dia 1 do mês seguinte", () => {
    expect(daysUntilNextMonth("2026-06", "2026-06-23")).toBe(8);
  });
  it("no último dia, o próximo mês começa em 1 dia", () => {
    expect(daysUntilNextMonth("2026-06", "2026-06-30")).toBe(1);
  });
});

describe("nextMonthFloorCents", () => {
  it("piso = sobra do mês menos a renda variável (estimada)", () => {
    const floor = nextMonthFloorCents({
      totals: { free: { cents: "50000" }, estimatedIncome: { cents: "20000" } },
    });
    expect(floor).toBe(30000n);
  });
});

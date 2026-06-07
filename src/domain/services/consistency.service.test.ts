import { describe, expect, it } from "vitest";

import {
  buildTrail,
  computeDelta,
  formatMonthShort,
  nextMilestoneFor,
  tierFor,
  type ClosingWithMetrics,
} from "./consistency.service";
import type { PrescriptionState } from "./prescription/prescription.types";

describe("tierFor", () => {
  it("mapeia meses ativos para patamar cumulativo", () => {
    expect(tierFor(0)).toBe("Começo");
    expect(tierFor(1)).toBe("Início");
    expect(tierFor(2)).toBe("Início");
    expect(tierFor(3)).toBe("No ritmo");
    expect(tierFor(5)).toBe("No ritmo");
    expect(tierFor(6)).toBe("Constância");
    expect(tierFor(11)).toBe("Constância");
    expect(tierFor(12)).toBe("Um ano firme");
    expect(tierFor(23)).toBe("Um ano firme");
    expect(tierFor(24)).toBe("Dois anos firme");
    expect(tierFor(59)).toBe("Dois anos firme");
    expect(tierFor(60)).toBe("Cinco anos firme");
    expect(tierFor(120)).toBe("Cinco anos firme");
  });
});

describe("nextMilestoneFor", () => {
  it("retorna o próximo marco e quantos meses faltam", () => {
    expect(nextMilestoneFor(0)).toEqual({ milestone: 3, monthsToNext: 3 });
    expect(nextMilestoneFor(4)).toEqual({ milestone: 6, monthsToNext: 2 });
    expect(nextMilestoneFor(12)).toEqual({ milestone: 24, monthsToNext: 12 });
  });

  it("retorna null quando já passou do último marco", () => {
    expect(nextMilestoneFor(60)).toEqual({ milestone: null, monthsToNext: null });
    expect(nextMilestoneFor(80)).toEqual({ milestone: null, monthsToNext: null });
  });
});

describe("buildTrail", () => {
  it("monta 6 posições (recente primeiro) marcando meses ativos", () => {
    const now = new Date(Date.UTC(2026, 5, 15));
    const active = ["2026-01", "2026-03", "2026-06"];
    expect(buildTrail(active, now)).toEqual([true, false, false, true, false, true]);
  });

  it("trilha toda falsa quando não há meses ativos", () => {
    const now = new Date(Date.UTC(2026, 5, 15));
    expect(buildTrail([], now)).toEqual([false, false, false, false, false, false]);
  });
});

describe("formatMonthShort", () => {
  it("formata Date como mes/ano abreviado pt-BR", () => {
    expect(formatMonthShort(new Date(Date.UTC(2025, 4, 1)))).toBe("mai/25");
    expect(formatMonthShort(new Date(Date.UTC(2026, 0, 1)))).toBe("jan/26");
  });
});

function closing(over: Partial<ClosingWithMetrics>): ClosingWithMetrics {
  return {
    month: new Date(Date.UTC(2025, 4, 1)),
    endNetWorthCents: 0n,
    endDebtBalanceCents: 0n,
    endReserveCents: 0n,
    committedPctBps: 0,
    ...over,
  };
}

describe("computeDelta", () => {
  it("retorna null quando há menos de 2 fechamentos", () => {
    expect(computeDelta("bleeding", [])).toBeNull();
    expect(computeDelta("bleeding", [closing({})])).toBeNull();
  });

  it("bleeding celebra dívida abatida (saldo caiu)", () => {
    const first = closing({ month: new Date(Date.UTC(2025, 4, 1)), endDebtBalanceCents: 10_000_00n });
    const last = closing({ month: new Date(Date.UTC(2025, 7, 1)), endDebtBalanceCents: 6_900_00n });
    expect(computeDelta("bleeding", [first, last])).toEqual({
      lever: "debt",
      direction: "positive",
      amountCents: 3_100_00n,
      pointsBps: null,
      sinceLabel: "mai/25",
    });
  });

  it("ready_to_grow celebra patrimônio crescendo", () => {
    const first = closing({ month: new Date(Date.UTC(2025, 4, 1)), endNetWorthCents: 5_000_00n });
    const last = closing({ month: new Date(Date.UTC(2025, 9, 1)), endNetWorthCents: 9_200_00n });
    expect(computeDelta("ready_to_grow", [first, last])).toEqual({
      lever: "net_worth",
      direction: "positive",
      amountCents: 4_200_00n,
      pointsBps: null,
      sinceLabel: "mai/25",
    });
  });

  it("no_cushion celebra reserva crescendo", () => {
    const first = closing({ endReserveCents: 1_000_00n });
    const last = closing({ month: new Date(Date.UTC(2025, 6, 1)), endReserveCents: 2_800_00n });
    expect(computeDelta("no_cushion", [first, last])).toMatchObject({
      lever: "reserve",
      direction: "positive",
      amountCents: 1_800_00n,
    });
  });

  it("tight celebra comprometido caindo (em pontos/bps)", () => {
    const first = closing({ committedPctBps: 5000 });
    const last = closing({ month: new Date(Date.UTC(2025, 6, 1)), committedPctBps: 4200 });
    expect(computeDelta("tight", [first, last])).toMatchObject({
      lever: "committed",
      direction: "positive",
      amountCents: null,
      pointsBps: 800,
    });
  });

  it("direção negativa quando a alavanca piora, sem culpa", () => {
    const first = closing({ endDebtBalanceCents: 6_000_00n });
    const last = closing({ month: new Date(Date.UTC(2025, 6, 1)), endDebtBalanceCents: 7_500_00n });
    expect(computeDelta("bleeding", [first, last])).toMatchObject({
      lever: "debt",
      direction: "negative",
      amountCents: 1_500_00n,
    });
  });

  it("flat quando não houve mudança", () => {
    const first = closing({ endNetWorthCents: 5_000_00n });
    const last = closing({ month: new Date(Date.UTC(2025, 6, 1)), endNetWorthCents: 5_000_00n });
    expect(computeDelta("ready_to_grow", [first, last])).toMatchObject({
      direction: "flat",
      amountCents: 0n,
    });
  });

  it("incomplete não produz delta", () => {
    const first = closing({ endNetWorthCents: 1n });
    const last = closing({ month: new Date(Date.UTC(2025, 6, 1)), endNetWorthCents: 2n });
    expect(computeDelta("incomplete" as PrescriptionState, [first, last])).toBeNull();
  });
});

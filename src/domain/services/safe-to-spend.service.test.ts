import { describe, expect, it } from "vitest";

import {
  computeSafeToSpend,
  goalRequiredMonthlyCents,
} from "./safe-to-spend.service";

describe("computeSafeToSpend", () => {
  it("mes positivo: pool = renda - compromissos - meta, semana = pool / 4.33", () => {
    const r = computeSafeToSpend({
      incomes: [{ monthlyCents: 500000n, isEstimated: false }],
      monthlyCommitmentsCents: 200000n,
      goalRequiredMonthlyCents: 50000n,
      level: "normal",
    });
    expect(r.poolCents).toBe(250000n);
    expect(r.state).toBe("ok");
    expect(r.perWeekCents).toBe(BigInt(Math.round(250000 / 4.33)));
    expect(r.shortfallCents).toBe(0n);
  });

  it("haircut incide so na renda estimada (normal = 85%)", () => {
    const r = computeSafeToSpend({
      incomes: [
        { monthlyCents: 300000n, isEstimated: false },
        { monthlyCents: 200000n, isEstimated: true },
      ],
      monthlyCommitmentsCents: 0n,
      goalRequiredMonthlyCents: 0n,
      level: "normal",
    });
    expect(r.conservativeIncomeCents).toBe(300000n + (200000n * 85n) / 100n);
  });

  it("cauteloso aperta mais que otimista", () => {
    const input = {
      incomes: [{ monthlyCents: 100000n, isEstimated: true }],
      monthlyCommitmentsCents: 0n,
      goalRequiredMonthlyCents: 0n,
    };
    const cautious = computeSafeToSpend({ ...input, level: "cautious" });
    const optimistic = computeSafeToSpend({ ...input, level: "optimistic" });
    expect(cautious.conservativeIncomeCents).toBe(70000n);
    expect(optimistic.conservativeIncomeCents).toBe(100000n);
  });

  it("tight-by-goal: negativo so por causa da meta", () => {
    const r = computeSafeToSpend({
      incomes: [{ monthlyCents: 300000n, isEstimated: false }],
      monthlyCommitmentsCents: 250000n,
      goalRequiredMonthlyCents: 100000n,
      level: "normal",
    });
    expect(r.state).toBe("tight-by-goal");
    expect(r.poolCents).toBe(-50000n);
    expect(r.poolWithoutGoalCents).toBe(50000n);
    expect(r.perWeekWithoutGoalCents).toBe(BigInt(Math.round(50000 / 4.33)));
    expect(r.shortfallCents).toBe(50000n);
    expect(r.perWeekCents).toBe(0n);
  });

  it("underwater: compromissos ja passam da renda garantida", () => {
    const r = computeSafeToSpend({
      incomes: [{ monthlyCents: 200000n, isEstimated: false }],
      monthlyCommitmentsCents: 300000n,
      goalRequiredMonthlyCents: 0n,
      level: "normal",
    });
    expect(r.state).toBe("underwater");
    expect(r.shortfallCents).toBe(100000n);
    expect(r.perWeekCents).toBe(0n);
  });
});

describe("goalRequiredMonthlyCents", () => {
  const now = new Date(Date.UTC(2026, 0, 1));

  it("meta com alvo e prazo: (alvo - guardado) / meses ate o prazo", () => {
    const v = goalRequiredMonthlyCents(
      { targetCents: 1200000n, manualSavedCents: 200000n, deadline: new Date(Date.UTC(2026, 10, 1)) },
      now,
    );
    expect(v).toBe(1000000n / 10n);
  });

  it("sem alvo ou sem prazo nao impoe mensalidade", () => {
    expect(goalRequiredMonthlyCents({ targetCents: null, manualSavedCents: 0n, deadline: new Date(Date.UTC(2026, 5, 1)) }, now)).toBe(0n);
    expect(goalRequiredMonthlyCents({ targetCents: 1000n, manualSavedCents: 0n, deadline: null }, now)).toBe(0n);
  });

  it("ja guardou o suficiente: zero", () => {
    expect(goalRequiredMonthlyCents({ targetCents: 1000n, manualSavedCents: 1000n, deadline: new Date(Date.UTC(2026, 5, 1)) }, now)).toBe(0n);
  });

  it("prazo no passado: zero (nao da pra mudar o passado)", () => {
    expect(goalRequiredMonthlyCents({ targetCents: 1000n, manualSavedCents: 0n, deadline: new Date(Date.UTC(2025, 5, 1)) }, now)).toBe(0n);
  });
});

import { describe, expect, it } from "vitest";

import { buildGoalSeedQuery, parseGoalSeed, type GoalSeed } from "./goal-seed";

describe("buildGoalSeedQuery", () => {
  it("emergency_fund", () => {
    const seed: GoalSeed = { type: "emergency_fund", targetMonths: 6, monthlyCostCents: "300000" };
    expect(buildGoalSeedQuery(seed)).toBe("from=sim&type=emergency_fund&months=6&costCents=300000");
  });
  it("savings com deadline", () => {
    const seed: GoalSeed = { type: "savings", targetCents: "4000000", savedCents: "100000", deadlineIso: "2030-01-01" };
    expect(buildGoalSeedQuery(seed)).toBe(
      "from=sim&type=savings&targetCents=4000000&savedCents=100000&deadlineIso=2030-01-01",
    );
  });
  it("financial_independence", () => {
    const seed: GoalSeed = { type: "financial_independence", monthlyCostCents: "500000", realReturnPct: 4 };
    expect(buildGoalSeedQuery(seed)).toBe("from=sim&type=financial_independence&costCents=500000&realReturnPct=4");
  });
  it("debt_payoff", () => {
    const seed: GoalSeed = { type: "debt_payoff", debtId: "abc-123" };
    expect(buildGoalSeedQuery(seed)).toBe("from=sim&type=debt_payoff&debtId=abc-123");
  });
});

describe("parseGoalSeed", () => {
  it("retorna null sem from=sim", () => {
    expect(parseGoalSeed({ type: "savings" })).toBeNull();
    expect(parseGoalSeed({ from: "x", type: "savings" })).toBeNull();
  });
  it("retorna null com type invalido", () => {
    expect(parseGoalSeed({ from: "sim", type: "nope" })).toBeNull();
  });
  it("emergency_fund valido", () => {
    expect(parseGoalSeed({ from: "sim", type: "emergency_fund", months: "6", costCents: "300000" })).toEqual({
      type: "emergency_fund",
      targetMonths: 6,
      monthlyCostCents: "300000",
    });
  });
  it("emergency_fund descarta centavos invalidos", () => {
    expect(parseGoalSeed({ from: "sim", type: "emergency_fund", months: "6", costCents: "-5" })).toBeNull();
  });
  it("savings: savedCents ausente vira 0; deadline opcional", () => {
    expect(parseGoalSeed({ from: "sim", type: "savings", targetCents: "4000000" })).toEqual({
      type: "savings",
      targetCents: "4000000",
      savedCents: "0",
      deadlineIso: null,
    });
  });
  it("financial_independence valido", () => {
    expect(
      parseGoalSeed({ from: "sim", type: "financial_independence", costCents: "500000", realReturnPct: "4" }),
    ).toEqual({ type: "financial_independence", monthlyCostCents: "500000", realReturnPct: 4 });
  });
  it("debt_payoff exige debtId", () => {
    expect(parseGoalSeed({ from: "sim", type: "debt_payoff" })).toBeNull();
    expect(parseGoalSeed({ from: "sim", type: "debt_payoff", debtId: "abc" })).toEqual({
      type: "debt_payoff",
      debtId: "abc",
    });
  });
  it("aceita valores em array (searchParams) usando o primeiro", () => {
    expect(parseGoalSeed({ from: ["sim"], type: ["debt_payoff"], debtId: ["abc"] })).toEqual({
      type: "debt_payoff",
      debtId: "abc",
    });
  });
});

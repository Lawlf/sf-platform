import { describe, expect, it } from "vitest";

import { GoalCascadeService, type CascadeGoalInput, type CascadeInput } from "./goal-cascade.service";

function reais(n: number): bigint {
  return BigInt(Math.round(n * 100));
}

describe("GoalCascadeService.simulate", () => {
  it("funds a single accumulate goal with no yield in ceil(target/free) months", () => {
    const input: CascadeInput = {
      monthlyFreeCashFlowCents: reais(2000),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "reserva",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(8000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    };

    const result = GoalCascadeService.simulate(input);

    expect(result.goals).toHaveLength(1);
    expect(result.goals[0]!).toEqual({
      goalId: "reserva",
      fundingStartMonth: 1,
      etaMonth: 4,
      reachedWithinHorizon: true,
    });
  });

  it("returns etaMonth 0 and null fundingStart for an already-complete goal", () => {
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(2000),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "done",
          kind: "accumulate",
          balanceCents: reais(8000),
          targetCents: reais(8000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });
    expect(result.goals[0]!).toEqual({
      goalId: "done",
      fundingStartMonth: null,
      etaMonth: 0,
      reachedWithinHorizon: true,
    });
  });

  it("reaches the target sooner when the goal's money yields a monthly rate", () => {
    const baseGoal: CascadeGoalInput = {
      goalId: "invest",
      kind: "accumulate",
      balanceCents: reais(0),
      targetCents: reais(100000),
      monthlyRate: 0,
      mode: "queue",
      order: 0,
      parallelFraction: 0,
    };
    const base: CascadeInput = {
      monthlyFreeCashFlowCents: reais(1000),
      horizonMonths: 1200,
      goals: [baseGoal],
    };

    const noYield = GoalCascadeService.simulate(base);
    const withYield = GoalCascadeService.simulate({
      ...base,
      goals: [{ ...baseGoal, monthlyRate: 0.01 }],
    });

    const noYieldEta = noYield.goals[0]!.etaMonth;
    const withYieldEta = withYield.goals[0]!.etaMonth;
    expect(noYieldEta).not.toBeNull();
    expect(withYieldEta).not.toBeNull();
    expect(withYieldEta as number).toBeLessThan(noYieldEta as number);
  });

  it("overflows the remainder into the next queue goal in the same month it completes one", () => {
    // Month 1..3: 600/mo into A (target 2000) => 1800. Month 4: A needs 200,
    // remainder 400 overflows into B. So A eta=4, B funding starts month 4.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(600),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "A",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(2000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
        {
          goalId: "B",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(5000),
          monthlyRate: 0,
          mode: "queue",
          order: 1,
          parallelFraction: 0,
        },
      ],
    });

    const a = result.goals.find((g) => g.goalId === "A")!;
    const b = result.goals.find((g) => g.goalId === "B")!;
    expect(a.etaMonth).toBe(4);
    expect(b.fundingStartMonth).toBe(4);
  });

  it("skims a fixed fraction for parallel goals before the queue pour", () => {
    // free 2000/mo. Parallel goal P skims 20% = 400/mo. Queue goal Q gets 1600/mo.
    // P target 4000 => eta 10. Q target 8000 => 8000/1600 = 5.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(2000),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "P",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(4000),
          monthlyRate: 0,
          mode: "parallel",
          order: 0,
          parallelFraction: 0.2,
        },
        {
          goalId: "Q",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(8000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });

    const p = result.goals.find((g) => g.goalId === "P")!;
    const q = result.goals.find((g) => g.goalId === "Q")!;
    expect(p.etaMonth).toBe(10);
    expect(q.etaMonth).toBe(5);
  });

  it("caps a parallel skim at the goal's remaining need and returns the excess to the queue", () => {
    // free 1000/mo, parallel fraction 0.5 = 500 skim. P needs only 200 total.
    // Month 1: P completes with 200, 300 excess returns to remainder; Q (target 10000)
    // therefore receives 1000-200 = 800 in month 1.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(1000),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "P",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(200),
          monthlyRate: 0,
          mode: "parallel",
          order: 0,
          parallelFraction: 0.5,
        },
        {
          goalId: "Q",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(10000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });

    const p = result.goals.find((g) => g.goalId === "P")!;
    const q = result.goals.find((g) => g.goalId === "Q")!;
    expect(p.etaMonth).toBe(1);
    // P's 300 capped-off excess returned to the pool, so Q was funded in month 1.
    expect(q.fundingStartMonth).toBe(1);
  });

  it("pays off a debt goal: interest accrues each month, payment shrinks the balance to zero", () => {
    // balance 1000, monthlyRate 0.01, payment from free 600/mo.
    // m1: 1000*1.01=1010 -600=410. m2: 410*1.01=414.1 -600 -> <=0 => eta 2.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(600),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "card",
          kind: "payoff",
          balanceCents: reais(1000),
          targetCents: reais(0),
          monthlyRate: 0.01,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });
    const g = result.goals[0]!;
    expect(g.etaMonth).toBe(2);
    expect(g.fundingStartMonth).toBe(1);
    expect(g.reachedWithinHorizon).toBe(true);
  });

  it("never finishes a debt whose interest outpaces the available payment", () => {
    // balance 10000, monthlyRate 0.05 (interest 500), payment only 400/mo: balance grows.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(400),
      horizonMonths: 60,
      goals: [
        {
          goalId: "spiral",
          kind: "payoff",
          balanceCents: reais(10000),
          targetCents: reais(0),
          monthlyRate: 0.05,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });
    const g = result.goals[0]!;
    expect(g.etaMonth).toBeNull();
    expect(g.reachedWithinHorizon).toBe(false);
  });

  it("funds nothing when free cash flow is zero", () => {
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(0),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "g",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(5000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });
    expect(result.goals[0]!).toEqual({
      goalId: "g",
      fundingStartMonth: null,
      etaMonth: null,
      reachedWithinHorizon: false,
    });
  });

  it("clamps a negative free cash flow to zero", () => {
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(-1500),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "g",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(5000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });
    expect(result.goals[0]!.fundingStartMonth).toBeNull();
  });

  it("returns an empty goals array unchanged", () => {
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(2000),
      horizonMonths: 1200,
      goals: [],
    });
    expect(result.goals).toEqual([]);
  });

  it("leaves a goal unreached when the horizon is too short", () => {
    // 100/mo into a 100000 target within 12 months: not reachable.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(100),
      horizonMonths: 12,
      goals: [
        {
          goalId: "far",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(100000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });
    const g = result.goals[0]!;
    expect(g.etaMonth).toBeNull();
    expect(g.reachedWithinHorizon).toBe(false);
    expect(g.fundingStartMonth).toBe(1); // it WAS funded, just not completed
  });

  it("two parallel goals with fractions summing below 1 leave the remainder for the queue", () => {
    // free 1000/mo; P1 fraction 0.3 => 300/mo, target 3000 => eta 10.
    // P2 fraction 0.3 => 300/mo, target 6000 => eta 20.
    // Queue Q gets 1000-300-300 = 400/mo, target 4000 => eta 10.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(1000),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "P1",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(3000),
          monthlyRate: 0,
          mode: "parallel",
          order: 0,
          parallelFraction: 0.3,
        },
        {
          goalId: "P2",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(6000),
          monthlyRate: 0,
          mode: "parallel",
          order: 1,
          parallelFraction: 0.3,
        },
        {
          goalId: "Q",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(4000),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });

    const p1 = result.goals.find((g) => g.goalId === "P1")!;
    const p2 = result.goals.find((g) => g.goalId === "P2")!;
    const q = result.goals.find((g) => g.goalId === "Q")!;
    expect(p1.etaMonth).toBe(10);
    expect(p2.etaMonth).toBe(20);
    expect(q.etaMonth).toBe(10);
  });

  it("freed parallel fraction flows into the queue after the parallel goal completes", () => {
    // free 1000/mo; P fraction 0.4 => 400/mo, target 1200 => eta 3.
    // Q queue, target 8400: months 1-3 receives 600/mo (=1800), then 1000/mo.
    // After month 3: needs 8400-1800=6600 more at 1000/mo => 7 more months => eta 10.
    // Without P freeing: Q would need ceil(8400/600)=14 months, so 10 < 14.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(1000),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "P",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(1200),
          monthlyRate: 0,
          mode: "parallel",
          order: 0,
          parallelFraction: 0.4,
        },
        {
          goalId: "Q",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(8400),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });

    const p = result.goals.find((g) => g.goalId === "P")!;
    const q = result.goals.find((g) => g.goalId === "Q")!;
    expect(p.etaMonth).toBe(3);
    expect(q.etaMonth).toBe(10);
  });

  it("caps parallel fractions that sum above 1 by priority order (first goal wins the remainder)", () => {
    // free 1000/mo; Pa order 0 fraction 0.6 => wants 600, gets 600, remaining 400.
    // Pb order 1 fraction 0.6 => wants 600, capped at 400/mo until Pa completes.
    // Pa target 3000: 600/mo => eta 5.
    // Pb months 1-5: 400/mo => 2000 accumulated. Month 5 Pa completes, so from month 6
    // Pb gets min(600, need): month 6 => 2000+600=2600, month 7 => 2600+600=3200>=3000 => eta 7.
    // Pa eta 5 < Pb eta 7 pins the first-wins-by-priority contract.
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(1000),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "Pa",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(3000),
          monthlyRate: 0,
          mode: "parallel",
          order: 0,
          parallelFraction: 0.6,
        },
        {
          goalId: "Pb",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(3000),
          monthlyRate: 0,
          mode: "parallel",
          order: 1,
          parallelFraction: 0.6,
        },
      ],
    });

    const pa = result.goals.find((g) => g.goalId === "Pa")!;
    const pb = result.goals.find((g) => g.goalId === "Pb")!;
    expect(pa.etaMonth).toBe(5);
    expect(pb.etaMonth).toBe(7);
  });

  it("breaks queue ties by goalId so that the lower goalId is funded first", () => {
    // free 500/mo; both goals order 0. "a" < "b" lexicographically.
    // Month 1: "a" receives 500 => completes (eta 1), remaining 0, "b" gets nothing.
    // Month 2: "b" receives 500 => completes (eta 2).
    const result = GoalCascadeService.simulate({
      monthlyFreeCashFlowCents: reais(500),
      horizonMonths: 1200,
      goals: [
        {
          goalId: "b",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(500),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
        {
          goalId: "a",
          kind: "accumulate",
          balanceCents: reais(0),
          targetCents: reais(500),
          monthlyRate: 0,
          mode: "queue",
          order: 0,
          parallelFraction: 0,
        },
      ],
    });

    const ga = result.goals.find((g) => g.goalId === "a")!;
    const gb = result.goals.find((g) => g.goalId === "b")!;
    expect(ga.etaMonth).toBe(1);
    expect(gb.etaMonth).toBe(2);
  });
});

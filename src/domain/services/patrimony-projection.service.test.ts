import { describe, expect, it } from "vitest";

import {
  PatrimonyProjectionService,
  type ProjectionInput,
} from "./patrimony-projection.service";

function reais(n: number): bigint {
  return BigInt(Math.round(n * 100));
}

const EMPTY: Omit<ProjectionInput, "assets"> = {
  debts: [],
  monthlyFreeCashFlowCents: 0n,
  liquidBucketMonthlyRate: 0,
  horizonMonths: 12,
};

describe("PatrimonyProjectionService.project", () => {
  it("emits one point per month and grows a yielding asset", () => {
    const result = PatrimonyProjectionService.project({
      ...EMPTY,
      horizonMonths: 3,
      assets: [{ assetId: "cdb", valueCents: reais(1000), monthlyGrowthRate: 0.01 }],
    });

    expect(result.points).toHaveLength(3);
    expect(result.points[0]!.month).toBe(1);
    // m1: 1000*1.01 = 1010; m2: 1020.10; m3: 1030.30 (rounded cents)
    expect(result.points[0]!.assetsCents).toBe(reais(1010));
    expect(result.points[1]!.assetsCents).toBe(reais(1020.1));
    expect(result.points[2]!.assetsCents).toBe(reais(1030.3));
    expect(result.points[2]!.netWorthCents).toBe(reais(1030.3));
    expect(result.points[2]!.debtsCents).toBe(0n);
  });

  it("depreciates an asset with a negative growth rate but never below zero", () => {
    const result = PatrimonyProjectionService.project({
      ...EMPTY,
      horizonMonths: 2,
      assets: [{ assetId: "car", valueCents: reais(1000), monthlyGrowthRate: -0.1 }],
    });
    // m1: 900; m2: 810
    expect(result.points[0]!.assetsCents).toBe(reais(900));
    expect(result.points[1]!.assetsCents).toBe(reais(810));
  });

  it("accumulates monthly free cash flow in the bucket with no yield", () => {
    const result = PatrimonyProjectionService.project({
      assets: [],
      debts: [],
      monthlyFreeCashFlowCents: reais(2000),
      liquidBucketMonthlyRate: 0,
      horizonMonths: 3,
    });
    // 2000, 4000, 6000
    expect(result.points[0]!.netWorthCents).toBe(reais(2000));
    expect(result.points[1]!.netWorthCents).toBe(reais(4000));
    expect(result.points[2]!.netWorthCents).toBe(reais(6000));
  });

  it("compounds the bucket when it yields", () => {
    const result = PatrimonyProjectionService.project({
      assets: [],
      debts: [],
      monthlyFreeCashFlowCents: reais(1000),
      liquidBucketMonthlyRate: 0.01,
      horizonMonths: 2,
    });
    // m1: 0*1.01 + 1000 = 1000; m2: 1000*1.01 + 1000 = 2010
    expect(result.points[0]!.netWorthCents).toBe(reais(1000));
    expect(result.points[1]!.netWorthCents).toBe(reais(2010));
  });

  it("clamps a negative free cash flow to zero", () => {
    const result = PatrimonyProjectionService.project({
      assets: [],
      debts: [],
      monthlyFreeCashFlowCents: reais(-500),
      liquidBucketMonthlyRate: 0,
      horizonMonths: 2,
    });
    expect(result.points[1]!.netWorthCents).toBe(0n);
  });

  it("amortizes a debt: interest accrues then the payment shrinks the balance", () => {
    const result = PatrimonyProjectionService.project({
      assets: [],
      debts: [{ debtId: "loan", balanceCents: reais(1000), monthlyRate: 0.01, monthlyPaymentCents: reais(300) }],
      monthlyFreeCashFlowCents: 0n,
      liquidBucketMonthlyRate: 0,
      horizonMonths: 2,
    });
    // m1: 1000*1.01 - 300 = 710; net = -710. m2: 710*1.01 - 300 = 417.10; net = -417.10
    expect(result.points[0]!.debtsCents).toBe(reais(710));
    expect(result.points[0]!.netWorthCents).toBe(reais(-710));
    expect(result.points[1]!.debtsCents).toBe(reais(417.1));
  });

  it("floors a debt at zero and keeps it there once paid off", () => {
    const result = PatrimonyProjectionService.project({
      assets: [],
      debts: [{ debtId: "small", balanceCents: reais(100), monthlyRate: 0, monthlyPaymentCents: reais(300) }],
      monthlyFreeCashFlowCents: 0n,
      liquidBucketMonthlyRate: 0,
      horizonMonths: 3,
    });
    // m1: max(0, 100-300)=0; stays 0
    expect(result.points[0]!.debtsCents).toBe(0n);
    expect(result.points[1]!.debtsCents).toBe(0n);
    expect(result.points[2]!.debtsCents).toBe(0n);
  });

  it("combines assets, bucket inflow, and debts into net worth", () => {
    const result = PatrimonyProjectionService.project({
      assets: [{ assetId: "a", valueCents: reais(5000), monthlyGrowthRate: 0 }],
      debts: [{ debtId: "d", balanceCents: reais(2000), monthlyRate: 0, monthlyPaymentCents: reais(500) }],
      monthlyFreeCashFlowCents: reais(1000),
      liquidBucketMonthlyRate: 0,
      horizonMonths: 1,
    });
    // assets: 5000 + bucket 1000 = 6000; debts: 1500; net 4500
    expect(result.points[0]!.assetsCents).toBe(reais(6000));
    expect(result.points[0]!.debtsCents).toBe(reais(1500));
    expect(result.points[0]!.netWorthCents).toBe(reais(4500));
  });

  it("returns no points when the horizon is zero", () => {
    const result = PatrimonyProjectionService.project({
      assets: [{ assetId: "a", valueCents: reais(1000), monthlyGrowthRate: 0.01 }],
      debts: [],
      monthlyFreeCashFlowCents: reais(1000),
      liquidBucketMonthlyRate: 0,
      horizonMonths: 0,
    });
    expect(result.points).toEqual([]);
  });

  it("projects a flat line when there is nothing to grow and no inflow", () => {
    const result = PatrimonyProjectionService.project({
      assets: [{ assetId: "a", valueCents: reais(1000), monthlyGrowthRate: 0 }],
      debts: [],
      monthlyFreeCashFlowCents: 0n,
      liquidBucketMonthlyRate: 0,
      horizonMonths: 3,
    });
    expect(result.points.map((p) => p.netWorthCents)).toEqual([
      reais(1000),
      reais(1000),
      reais(1000),
    ]);
  });

  it("netWorthCents equals assetsCents minus debtsCents for every point (rounding invariant)", () => {
    const result = PatrimonyProjectionService.project({
      assets: [{ assetId: "cdb", valueCents: reais(5000), monthlyGrowthRate: 0.0083 }],
      debts: [{ debtId: "loan", balanceCents: reais(3000), monthlyRate: 0.0083, monthlyPaymentCents: reais(150) }],
      monthlyFreeCashFlowCents: reais(500),
      liquidBucketMonthlyRate: 0.0083,
      horizonMonths: 12,
    });
    expect(result.points).toHaveLength(12);
    for (const point of result.points) {
      expect(point.netWorthCents).toBe(point.assetsCents - point.debtsCents);
    }
  });
});

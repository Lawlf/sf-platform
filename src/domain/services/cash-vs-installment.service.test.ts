import { describe, expect, it } from "vitest";

import { CashVsInstallmentService } from "./cash-vs-installment.service";

describe("CashVsInstallmentService.compute", () => {
  it("recommends à vista when the discount beats the financing benefit", () => {
    const r = CashVsInstallmentService.compute({
      fullPriceCents: 1_000_00n,
      discountPct: 10,
      installments: 10,
      annualRatePct: 12,
    });
    expect(Number(r.cashPriceCents) / 100).toBeCloseTo(900, 2);
    // VP do parcelado ~ 949,75 > 900 à vista
    expect(Number(r.presentValueInstallmentCents) / 100).toBeCloseTo(949.75, 0);
    expect(r.recommendation).toBe("avista");
  });

  it("recommends parcelar when the discount is small", () => {
    const r = CashVsInstallmentService.compute({
      fullPriceCents: 1_000_00n,
      discountPct: 2,
      installments: 10,
      annualRatePct: 12,
    });
    expect(Number(r.cashPriceCents) / 100).toBeCloseTo(980, 2);
    expect(r.recommendation).toBe("parcelar");
  });

  it("with zero yield, present value equals the full price", () => {
    const r = CashVsInstallmentService.compute({
      fullPriceCents: 1_000_00n,
      discountPct: 10,
      installments: 10,
      annualRatePct: 0,
    });
    expect(Number(r.presentValueInstallmentCents) / 100).toBeCloseTo(1000, 2);
    expect(r.recommendation).toBe("avista");
  });
});

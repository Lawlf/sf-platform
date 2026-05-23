import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { StoryDetectionService } from "./story-detection.service";
import type { MonthlyDataPoint } from "./timeline.service";

function makePoint(overrides: {
  month: MonthYear;
  freeBalanceCents?: bigint;
  netWorthCents?: bigint;
  totalIncomeCents?: bigint;
  totalDebtPaymentsCents?: bigint;
  assetsTotalCents?: bigint;
  debtsBalanceCents?: bigint;
}): MonthlyDataPoint {
  return {
    month: overrides.month,
    totalIncome: Money.fromCents(overrides.totalIncomeCents ?? 0n),
    totalDebtPayments: Money.fromCents(overrides.totalDebtPaymentsCents ?? 0n),
    freeBalance: Money.fromCents(overrides.freeBalanceCents ?? 0n),
    netWorth: Money.fromCents(overrides.netWorthCents ?? 0n),
    assetsTotal: Money.fromCents(overrides.assetsTotalCents ?? 0n),
    debtsBalance: Money.fromCents(overrides.debtsBalanceCents ?? 0n),
  };
}

describe("StoryDetectionService", () => {
  it("returns empty when no points", () => {
    expect(StoryDetectionService.detect([])).toEqual([]);
  });

  it("detects milestone when netWorth crosses 10k", () => {
    const points = [
      makePoint({ month: MonthYear.from(2026, 1), netWorthCents: 8_00000n }), // 8k
      makePoint({ month: MonthYear.from(2026, 2), netWorthCents: 12_00000n }), // 12k
    ];
    const stories = StoryDetectionService.detect(points);
    expect(stories.length).toBeGreaterThanOrEqual(1);
    const milestone = stories.find((s) => s.kind === "milestone");
    expect(milestone).toBeDefined();
    expect(milestone?.monthIso).toBe("2026-02");
  });

  it("detects 2 milestones when crossing 10k then 20k", () => {
    const points = [
      makePoint({ month: MonthYear.from(2026, 1), netWorthCents: 5_00000n }),
      makePoint({ month: MonthYear.from(2026, 3), netWorthCents: 15_00000n }), // crosses 10k
      makePoint({ month: MonthYear.from(2026, 5), netWorthCents: 25_00000n }), // crosses 20k
    ];
    const stories = StoryDetectionService.detect(points);
    const milestones = stories.filter((s) => s.kind === "milestone");
    // Each milestone in a month >=2 months apart should both be kept
    expect(milestones.length).toBe(2);
  });

  it("detects achievement when 3 consecutive positive months", () => {
    const points = [
      makePoint({ month: MonthYear.from(2026, 1), freeBalanceCents: 100_00n }),
      makePoint({ month: MonthYear.from(2026, 2), freeBalanceCents: 100_00n }),
      makePoint({ month: MonthYear.from(2026, 3), freeBalanceCents: 100_00n }),
    ];
    const stories = StoryDetectionService.detect(points);
    const achievement = stories.find((s) => s.kind === "achievement");
    expect(achievement).toBeDefined();
    expect(achievement?.iconName).toBe("Flame");
  });

  it("detects warning for negative balance", () => {
    const points = [
      makePoint({ month: MonthYear.from(2026, 1), freeBalanceCents: 100_00n }),
      makePoint({ month: MonthYear.from(2026, 3), freeBalanceCents: -500_00n }),
    ];
    const stories = StoryDetectionService.detect(points);
    const warning = stories.find((s) => s.kind === "warning");
    expect(warning).toBeDefined();
    expect(warning?.iconName).toBe("AlertTriangle");
  });

  it("detects best month as insight (>=3 points)", () => {
    const points = [
      makePoint({ month: MonthYear.from(2026, 1), freeBalanceCents: 100_00n }),
      makePoint({ month: MonthYear.from(2026, 2), freeBalanceCents: 500_00n }),
      makePoint({ month: MonthYear.from(2026, 3), freeBalanceCents: 200_00n }),
    ];
    const stories = StoryDetectionService.detect(points);
    const insight = stories.find((s) => s.kind === "insight");
    expect(insight).toBeDefined();
    expect(insight?.monthIso).toBe("2026-02");
  });

  it("caps stories: only 1 per 2-month window, prioritizing achievement > milestone > warning > insight", () => {
    // Same month: achievement + milestone -> achievement wins
    const points = [
      makePoint({
        month: MonthYear.from(2026, 1),
        freeBalanceCents: 100_00n,
        netWorthCents: 8_00000n,
      }),
      makePoint({
        month: MonthYear.from(2026, 2),
        freeBalanceCents: 100_00n,
        netWorthCents: 9_00000n,
      }),
      makePoint({
        month: MonthYear.from(2026, 3),
        freeBalanceCents: 100_00n,
        netWorthCents: 15_00000n,
      }), // streak=3 (achievement) AND crosses 10k (milestone)
    ];
    const stories = StoryDetectionService.detect(points);
    const inMar = stories.filter((s) => s.monthIso === "2026-03");
    expect(inMar.length).toBe(1);
    expect(inMar[0]?.kind).toBe("achievement");
  });

  it("does not emit insight when best month has zero or negative balance", () => {
    const points = [
      makePoint({ month: MonthYear.from(2026, 1), freeBalanceCents: -100_00n }),
      makePoint({ month: MonthYear.from(2026, 2), freeBalanceCents: -200_00n }),
      makePoint({ month: MonthYear.from(2026, 3), freeBalanceCents: -50_00n }),
    ];
    const stories = StoryDetectionService.detect(points);
    const insight = stories.find((s) => s.kind === "insight");
    expect(insight).toBeUndefined();
  });

  it("returns sorted by monthIso ascending", () => {
    const points = [
      makePoint({
        month: MonthYear.from(2026, 3),
        freeBalanceCents: 100_00n,
        netWorthCents: 15_00000n,
      }),
      makePoint({
        month: MonthYear.from(2026, 1),
        freeBalanceCents: 100_00n,
        netWorthCents: 8_00000n,
      }),
      makePoint({
        month: MonthYear.from(2026, 5),
        freeBalanceCents: 200_00n,
        netWorthCents: 25_00000n,
      }),
    ];
    const stories = StoryDetectionService.detect(points);
    for (let i = 1; i < stories.length; i++) {
      expect(stories[i]!.monthIso >= stories[i - 1]!.monthIso).toBe(true);
    }
  });

  it("line contains [[strong]] markers for client to replace", () => {
    const points = [
      makePoint({ month: MonthYear.from(2026, 1), netWorthCents: 5_00000n }),
      makePoint({ month: MonthYear.from(2026, 2), netWorthCents: 12_00000n }),
    ];
    const stories = StoryDetectionService.detect(points);
    const m = stories.find((s) => s.kind === "milestone");
    expect(m?.line.includes("[[")).toBe(true);
    expect(m?.line.includes("]]")).toBe(true);
  });
});

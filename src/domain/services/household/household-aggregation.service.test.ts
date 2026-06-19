import { describe, expect, it } from "vitest";

import { combineHouseholdSnapshot } from "./household-aggregation.service";

describe("combineHouseholdSnapshot", () => {
  it("sums two profiles correctly and computes derived fields", () => {
    const result = combineHouseholdSnapshot([
      {
        profileId: "p1",
        ownerUserId: "u1",
        displayName: "Perfil PF",
        shareLevel: "aggregate",
        incomeCents: 500_000n,
        debtBalanceCents: 0n,
        monthlyServiceCents: 100_000n,
        netWorthCents: 2_000_000n,
      },
      {
        profileId: "p2",
        ownerUserId: "u2",
        displayName: "Parceira",
        shareLevel: "detail",
        incomeCents: 300_000n,
        debtBalanceCents: 0n,
        monthlyServiceCents: 50_000n,
        netWorthCents: -500_000n,
      },
    ]);

    expect(result.totalIncomeCents).toBe(800_000n);
    expect(result.totalMonthlyServiceCents).toBe(150_000n);
    expect(result.freeCents).toBe(650_000n);
    expect(result.committedPctBps).toBe(1875n);
    expect(result.netWorthCents).toBe(1_500_000n);
  });

  it("committedPctBps is 0 when totalIncome is 0 (no div/0)", () => {
    const result = combineHouseholdSnapshot([
      {
        profileId: "p1",
        ownerUserId: "u1",
        displayName: null,
        shareLevel: "aggregate",
        incomeCents: 0n,
        debtBalanceCents: 0n,
        monthlyServiceCents: 0n,
        netWorthCents: 0n,
      },
    ]);

    expect(result.totalIncomeCents).toBe(0n);
    expect(result.committedPctBps).toBe(0n);
    expect(result.freeCents).toBe(0n);
  });

  it("contributions preserves per-profile data including shareLevel", () => {
    const parts = [
      {
        profileId: "p1",
        ownerUserId: "u1",
        displayName: "Alice",
        shareLevel: "aggregate" as const,
        incomeCents: 200_000n,
        debtBalanceCents: 50_000n,
        monthlyServiceCents: 20_000n,
        netWorthCents: 500_000n,
      },
      {
        profileId: "p2",
        ownerUserId: "u2",
        displayName: "Bob",
        shareLevel: "detail" as const,
        incomeCents: 300_000n,
        debtBalanceCents: 100_000n,
        monthlyServiceCents: 30_000n,
        netWorthCents: 800_000n,
      },
    ];

    const result = combineHouseholdSnapshot(parts);

    expect(result.contributions).toHaveLength(2);

    const c1 = result.contributions[0];
    expect(c1?.profileId).toBe("p1");
    expect(c1?.displayName).toBe("Alice");
    expect(c1?.shareLevel).toBe("aggregate");
    expect(c1?.incomeCents).toBe(200_000n);
    expect(c1?.debtBalanceCents).toBe(50_000n);
    expect(c1?.netWorthCents).toBe(500_000n);

    const c2 = result.contributions[1];
    expect(c2?.profileId).toBe("p2");
    expect(c2?.shareLevel).toBe("detail");
  });

  it("totalDebtBalanceCents sums correctly across profiles", () => {
    const result = combineHouseholdSnapshot([
      {
        profileId: "p1",
        ownerUserId: "u1",
        displayName: null,
        shareLevel: "aggregate",
        incomeCents: 100_000n,
        debtBalanceCents: 30_000n,
        monthlyServiceCents: 5_000n,
        netWorthCents: 100_000n,
      },
      {
        profileId: "p2",
        ownerUserId: "u2",
        displayName: null,
        shareLevel: "aggregate",
        incomeCents: 100_000n,
        debtBalanceCents: 70_000n,
        monthlyServiceCents: 10_000n,
        netWorthCents: 200_000n,
      },
    ]);

    expect(result.totalDebtBalanceCents).toBe(100_000n);
  });
});

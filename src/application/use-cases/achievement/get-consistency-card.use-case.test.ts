import { describe, expect, it } from "vitest";

import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";
import type { PrescriptionState } from "@/domain/services/prescription/prescription.types";

import { getConsistencyCard, type GetConsistencyCardDeps } from "./get-consistency-card.use-case";

function deps(over: {
  activeMonths?: string[];
  closings?: MonthClosingEntity[];
  state?: PrescriptionState;
}): { deps: GetConsistencyCardDeps; state: PrescriptionState } {
  return {
    state: over.state ?? "ready_to_grow",
    deps: {
      usage: { listActiveMonthIsos: async () => over.activeMonths ?? [] },
      closings: { listForProfile: async () => over.closings ?? [] },
      now: () => new Date(Date.UTC(2026, 5, 15)),
    },
  };
}

function closing(month: string, over: Partial<MonthClosingEntity> = {}): MonthClosingEntity {
  const [y, m] = month.split("-").map(Number);
  return {
    userId: "u1",
    profileId: "profile-1",
    month: new Date(Date.UTC(y!, m! - 1, 1)),
    baselineNetWorthCents: 0n,
    endNetWorthCents: 0n,
    theoreticalFreeCashFlowCents: 0n,
    leakCents: 0n,
    endDebtBalanceCents: null,
    endReserveCents: null,
    committedPctBps: null,
    closedAt: new Date(Date.UTC(y!, m! - 1, 28)),
    ...over,
  };
}

describe("getConsistencyCard", () => {
  it("estado vazio: 0 meses, patamar Começo, sem delta", async () => {
    const { deps: d, state } = deps({ activeMonths: [] });
    const view = await getConsistencyCard(d, { userId: "u1", profileId: "profile-1", state });
    expect(view.tier).toBe("Começo");
    expect(view.monthsActive).toBe(0);
    expect(view.delta).toBeNull();
    expect(view.trail).toHaveLength(6);
  });

  it("ativo sem 2 fechamentos com dado: patamar + marco, delta null", async () => {
    const { deps: d, state } = deps({
      activeMonths: ["2026-03", "2026-04", "2026-05", "2026-06"],
    });
    const view = await getConsistencyCard(d, { userId: "u1", profileId: "profile-1", state });
    expect(view.tier).toBe("No ritmo");
    expect(view.monthsActive).toBe(4);
    expect(view.milestone).toBe(6);
    expect(view.monthsToNext).toBe(2);
    expect(view.delta).toBeNull();
  });

  it("ignora fechamentos pré-migration (campos null) ao calcular delta", async () => {
    const { deps: d, state } = deps({
      activeMonths: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"],
      state: "ready_to_grow",
      closings: [
        closing("2025-12"),
        closing("2026-05", {
          endNetWorthCents: 5_000_00n,
          endDebtBalanceCents: 0n,
          endReserveCents: 0n,
          committedPctBps: 0,
        }),
        closing("2026-06", {
          endNetWorthCents: 8_000_00n,
          endDebtBalanceCents: 0n,
          endReserveCents: 0n,
          committedPctBps: 0,
        }),
      ],
    });
    const view = await getConsistencyCard(d, { userId: "u1", profileId: "profile-1", state });
    expect(view.delta).toMatchObject({
      lever: "net_worth",
      direction: "positive",
      amountCents: 3_000_00n,
      sinceLabel: "mai/26",
    });
  });

  it("um único fechamento com dado não gera delta", async () => {
    const { deps: d, state } = deps({
      activeMonths: ["2026-06"],
      closings: [closing("2026-06", { endNetWorthCents: 5_000_00n })],
    });
    const view = await getConsistencyCard(d, { userId: "u1", profileId: "profile-1", state });
    expect(view.delta).toBeNull();
  });
});

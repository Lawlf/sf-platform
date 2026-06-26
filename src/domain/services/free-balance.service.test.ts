import { describe, expect, it } from "vitest";

import { FreeBalanceService, type FreeBalanceState } from "./free-balance.service";

const EMPTY: FreeBalanceState = {
  accumulatedCents: 0n,
  committedCoveredCents: 0n,
  monthIso: null,
};

describe("FreeBalanceService.applyEvent", () => {
  it("primeiro evento do mês: cobre o comprometido e joga o resto no balde", () => {
    const r = FreeBalanceService.applyEvent(EMPTY, {
      eventAmountCents: 600000n,
      owedCents: 230000n,
      monthIso: "2026-06",
    });

    expect(r.jaTemDonoCents).toBe(230000n);
    expect(r.livreCents).toBe(370000n);
    expect(r.accumulatedCents).toBe(370000n);
    expect(r.next.committedCoveredCents).toBe(230000n);
    expect(r.next.monthIso).toBe("2026-06");
  });

  it("segundo evento no mesmo mês não abate o comprometido de novo (anti double-count)", () => {
    const prev: FreeBalanceState = {
      accumulatedCents: 370000n,
      committedCoveredCents: 230000n,
      monthIso: "2026-06",
    };

    const r = FreeBalanceService.applyEvent(prev, {
      eventAmountCents: 200000n,
      owedCents: 230000n,
      monthIso: "2026-06",
    });

    expect(r.jaTemDonoCents).toBe(0n);
    expect(r.livreCents).toBe(200000n);
    expect(r.accumulatedCents).toBe(570000n);
  });

  it("virada de mês reseta o comprometido coberto, mas mantém o balde", () => {
    const prev: FreeBalanceState = {
      accumulatedCents: 570000n,
      committedCoveredCents: 230000n,
      monthIso: "2026-06",
    };

    const r = FreeBalanceService.applyEvent(prev, {
      eventAmountCents: 300000n,
      owedCents: 230000n,
      monthIso: "2026-07",
    });

    expect(r.jaTemDonoCents).toBe(230000n);
    expect(r.livreCents).toBe(70000n);
    expect(r.accumulatedCents).toBe(640000n);
    expect(r.next.committedCoveredCents).toBe(230000n);
    expect(r.next.monthIso).toBe("2026-07");
  });
});

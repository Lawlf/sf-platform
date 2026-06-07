import { describe, expect, it } from "vitest";

import { detectPatterns } from "./detect-patterns";
import type { OfxTxn } from "./ofx-types";

function txn(p: Partial<OfxTxn>): OfxTxn {
  return {
    fitId: p.fitId ?? "f",
    postedAt: p.postedAt ?? new Date(Date.UTC(2026, 0, 5)),
    amountCents: p.amountCents ?? 100n,
    direction: p.direction ?? "in",
    memo: p.memo ?? "X",
  };
}

describe("detectPatterns", () => {
  it("suggests income from recurring same-value credits on a stable day", () => {
    const txns = [
      txn({ fitId: "a", direction: "in", amountCents: 500000n, memo: "SALARIO ACME", postedAt: new Date(Date.UTC(2026, 0, 5)) }),
      txn({ fitId: "b", direction: "in", amountCents: 500000n, memo: "SALARIO ACME", postedAt: new Date(Date.UTC(2026, 1, 5)) }),
      txn({ fitId: "c", direction: "in", amountCents: 500000n, memo: "SALARIO ACME", postedAt: new Date(Date.UTC(2026, 2, 6)) }),
    ];
    const s = detectPatterns(txns);
    expect(s.incomes).toHaveLength(1);
    expect(s.incomes[0]).toMatchObject({ amountCents: 500000n, occurrences: 3, dayOfMonth: 5 });
    expect(s.incomes[0]?.fitIds).toEqual(["a", "b", "c"]);
  });

  it("suggests a debt stub from a Parcela N/M memo", () => {
    const txns = [
      txn({ fitId: "p", direction: "out", amountCents: 34000n, memo: "PARCELA 3/12 LOJA X" }),
    ];
    const s = detectPatterns(txns);
    expect(s.debts).toHaveLength(1);
    expect(s.debts[0]).toMatchObject({
      installmentCents: 34000n,
      installmentsPaid: 3,
      installmentsTotal: 12,
    });
  });

  it("does not suggest income from a single non-recurring credit", () => {
    const s = detectPatterns([txn({ fitId: "x", direction: "in", amountCents: 1200n, memo: "PIX RANDOM" })]);
    expect(s.incomes).toHaveLength(0);
  });
});

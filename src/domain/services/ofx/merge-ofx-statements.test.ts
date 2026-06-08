import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { mergeOfxStatements } from "./merge-ofx-statements";
import type { OfxStatement, OfxTxn } from "./ofx-types";

function txn(p: Partial<OfxTxn>): OfxTxn {
  return {
    fitId: p.fitId ?? "f",
    postedAt: p.postedAt ?? new Date(Date.UTC(2026, 0, 5)),
    amountCents: p.amountCents ?? 100n,
    direction: p.direction ?? "in",
    memo: p.memo ?? "X",
  };
}

function stmt(p: Partial<OfxStatement>): OfxStatement {
  return {
    accountKey: p.accountKey ?? "260:9",
    currency: "BRL",
    ledgerBalanceCents: p.ledgerBalanceCents ?? 0n,
    asOf: p.asOf ?? null,
    transactions: p.transactions ?? [],
  };
}

describe("mergeOfxStatements", () => {
  it("merges same-account statements, dedupes by fitId, keeps the latest ledger balance", () => {
    const jan = stmt({
      ledgerBalanceCents: 10000n,
      asOf: new Date(Date.UTC(2026, 0, 31)),
      transactions: [txn({ fitId: "A1" }), txn({ fitId: "A2" })],
    });
    const feb = stmt({
      ledgerBalanceCents: 25000n,
      asOf: new Date(Date.UTC(2026, 1, 28)),
      transactions: [txn({ fitId: "A2" }), txn({ fitId: "A3" })],
    });
    const r = mergeOfxStatements([jan, feb]);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.transactions.map((t) => t.fitId).sort()).toEqual(["A1", "A2", "A3"]);
    expect(r.value.ledgerBalanceCents).toBe(25000n);
  });

  it("rejects a batch mixing different accounts", () => {
    const r = mergeOfxStatements([stmt({ accountKey: "260:9" }), stmt({ accountKey: "341:1" })]);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe("mixed_accounts");
  });

  it("errors on an empty list", () => {
    const r = mergeOfxStatements([]);
    expect(isErr(r)).toBe(true);
  });
});

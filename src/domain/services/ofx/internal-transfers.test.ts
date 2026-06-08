import { describe, expect, it } from "vitest";

import { findInternalTransfers, isInternalish } from "./internal-transfers";
import type { OfxTxn } from "./ofx-types";

function txn(fitId: string, day: number, cents: bigint, dir: "in" | "out", memo: string): OfxTxn {
  return { fitId, postedAt: new Date(Date.UTC(2026, 5, day)), amountCents: cents, direction: dir, memo };
}

describe("isInternalish", () => {
  it("matches self-account terms", () => {
    expect(isInternalish("Aplicação RDB")).toBe(true);
    expect(isInternalish("Resgate de empréstimo")).toBe(true);
    expect(isInternalish("Rendimento")).toBe(true);
    expect(isInternalish("Guardado na caixinha")).toBe(true);
  });
  it("does not match real external flows", () => {
    expect(isInternalish("Transferência recebida pelo Pix - Joao")).toBe(false);
    expect(isInternalish("Supermercado")).toBe(false);
  });
});

describe("findInternalTransfers", () => {
  it("nets a pair only when BOTH legs are internal (loan churn)", () => {
    const txns = [
      txn("a", 1, 131915n, "in", "Resgate RDB"),
      txn("b", 1, 131915n, "out", "Resgate de empréstimo"),
    ];
    const m = findInternalTransfers(txns);
    expect(m.pairedFitIds).toEqual(new Set(["a", "b"]));
  });

  it("does NOT net a pair when one leg is real income (Pix + RDB application)", () => {
    const txns = [
      txn("p", 5, 111920n, "in", "Transferência recebida pelo Pix - Hercilio"),
      txn("r", 5, 111920n, "out", "Aplicação RDB"),
    ];
    const m = findInternalTransfers(txns);
    expect(m.pairedFitIds.size).toBe(0);
    expect(m.reserveFitIds).toEqual(new Set(["r"]));
    expect(m.internalFitIds).toEqual(new Set(["r"]));
  });

  it("keeps an unpaired RDB application as reserve", () => {
    const txns = [txn("x", 6, 50000n, "out", "Aplicação RDB")];
    const m = findInternalTransfers(txns);
    expect(m.pairedFitIds.size).toBe(0);
    expect(m.reserveFitIds).toEqual(new Set(["x"]));
    expect(m.internalFitIds).toEqual(new Set(["x"]));
  });

  it("does not pair across different days", () => {
    const txns = [
      txn("a", 1, 5000n, "in", "Resgate RDB"),
      txn("b", 2, 5000n, "out", "Aplicação RDB"),
    ];
    const m = findInternalTransfers(txns);
    expect(m.pairedFitIds.size).toBe(0);
  });
});

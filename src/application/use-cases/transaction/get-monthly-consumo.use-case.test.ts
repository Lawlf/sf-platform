import { describe, expect, it } from "vitest";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { getMonthlyConsumo } from "./get-monthly-consumo.use-case";

function txn(p: Partial<TransactionEntity>): TransactionEntity {
  return {
    id: p.id ?? "t",
    userId: "u1",
    profileId: "profile-1",
    direction: p.direction ?? "out",
    amount: p.amount ?? Money.fromCents(1000n),
    description: p.description ?? "X",
    category: p.category ?? null,
    accountId: "a1",
    occurredAt: p.occurredAt ?? new Date(Date.UTC(2026, 5, 10)),
    status: "paid",
    excludedFromTotals: false,
    source: p.source ?? "ofx_import",
    externalId: null,
    createdAt: new Date(Date.UTC(2026, 5, 10)),
    deletedAt: null,
  };
}

function makeDeps(txns: TransactionEntity[]) {
  return { transactions: { listForProfileInRange: async () => txns } };
}

describe("getMonthlyConsumo", () => {
  it("aggregates imported out-flows into total and three buckets, excluding reserve and income", async () => {
    const txns = [
      txn({ description: "Supermercado", amount: Money.fromCents(20000n) }),
      txn({ description: "PARCELA 2/10 LOJA", amount: Money.fromCents(5000n) }),
      txn({ description: "iFood", amount: Money.fromCents(3000n) }),
      txn({ description: "Aplicação RDB", amount: Money.fromCents(100000n) }),
      txn({ description: "SALARIO", direction: "in", amount: Money.fromCents(500000n) }),
      txn({ description: "Compra manual", source: "manual", amount: Money.fromCents(9999n) }),
    ];
    const r = await getMonthlyConsumo(makeDeps(txns), {
      profileId: "profile-1",
      from: new Date(Date.UTC(2026, 5, 1)),
      to: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
    });
    expect(r.totalCents).toBe(28000n);
    expect(r.essencialCents).toBe(20000n);
    expect(r.parceladoCents).toBe(5000n);
    expect(r.restoCents).toBe(3000n);
  });

  it("excludes promoted-debt and internal-transfer categories from consumo", async () => {
    const txns = [
      txn({ description: "Supermercado", amount: Money.fromCents(20000n) }),
      txn({ description: "Loja 3/10", amount: Money.fromCents(5000n), category: "promoted_debt" }),
      txn({ description: "Resgate de empréstimo", amount: Money.fromCents(131915n), category: "internal_transfer" }),
    ];
    const r = await getMonthlyConsumo(makeDeps(txns), {
      profileId: "profile-1",
      from: new Date(Date.UTC(2026, 5, 1)),
      to: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
    });
    expect(r.totalCents).toBe(20000n);
  });

  it("returns all zeros when there is no imported consumo", async () => {
    const r = await getMonthlyConsumo(makeDeps([]), {
      profileId: "profile-1",
      from: new Date(Date.UTC(2026, 5, 1)),
      to: new Date(Date.UTC(2026, 5, 30)),
    });
    expect(r.totalCents).toBe(0n);
  });
});

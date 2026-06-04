import { describe, expect, it } from "vitest";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { getAnnualReport } from "./get-annual-report.use-case";

function txn(iso: string, cents: bigint, category: string | null): TransactionEntity {
  return {
    id: crypto.randomUUID(),
    userId: "u1",
    occurredAt: new Date(iso),
    amount: Money.fromCents(cents),
    description: "x",
    category,
    createdAt: new Date(iso),
    deletedAt: null,
  };
}

function fakeRepo(rows: TransactionEntity[]): TransactionRepository {
  return {
    async create() {
      throw new Error("not used");
    },
    async listForUserInRange(_userId, from, to) {
      return rows.filter((r) => r.occurredAt >= from && r.occurredAt <= to);
    },
  };
}

describe("getAnnualReport", () => {
  it("rejects Free users", async () => {
    const result = await getAnnualReport(
      { transactions: fakeRepo([]) },
      { userId: "u1", year: 2026, isPro: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Pro/);
  });

  it("aggregates the year for a Pro user", async () => {
    const repo = fakeRepo([
      txn("2026-01-10T00:00:00Z", 4000n, "alimentação"),
      txn("2026-03-05T00:00:00Z", 6000n, "transporte"),
      txn("2025-12-31T00:00:00Z", 9999n, "alimentação"),
    ]);
    const result = await getAnnualReport(
      { transactions: repo },
      { userId: "u1", year: 2026, isPro: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.totalCents).toBe(10000n);
      expect(result.report.byMonth[0]).toEqual({ month: 1, totalCents: 4000n });
      expect(result.report.byCategory[0]?.totalCents).toBe(6000n);
    }
  });
});

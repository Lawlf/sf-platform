import { describe, expect, it } from "vitest";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { getAnnualReport } from "./get-annual-report.use-case";

function txn(
  iso: string,
  cents: bigint,
  opts: {
    description?: string;
    category?: string | null;
    direction?: "in" | "out";
  } = {},
): TransactionEntity {
  return {
    id: crypto.randomUUID(),
    userId: "u1",
    direction: opts.direction ?? "out",
    occurredAt: new Date(iso),
    amount: Money.fromCents(cents),
    description: opts.description ?? "compra qualquer",
    category: opts.category ?? null,
    accountId: null,
    status: "paid",
    source: "manual",
    externalId: null,
    createdAt: new Date(iso),
    deletedAt: null,
  };
}

function fakeRepo(rows: TransactionEntity[]): TransactionRepositoryPort {
  return {
    async create() {
      throw new Error("not used");
    },
    async update() {
      throw new Error("not used");
    },
    async findByIdForUser() {
      throw new Error("not used");
    },
    async listByAccount() {
      throw new Error("not used");
    },
    async listByAccountPaged() {
      throw new Error("not used");
    },
    async countByAccount() {
      throw new Error("not used");
    },
    async monthSummariesByAccount() {
      throw new Error("not used");
    },
    async softDelete() {
      throw new Error("not used");
    },
    async existingExternalIds() {
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

  it("aggregates the year and ignores other years", async () => {
    const repo = fakeRepo([
      txn("2026-01-10T00:00:00Z", 4000n, { description: "SUPERMERCADO" }),
      txn("2026-03-05T00:00:00Z", 6000n, { description: "UBER TRIP" }),
      txn("2025-12-31T00:00:00Z", 9999n, { description: "SUPERMERCADO" }),
    ]);
    const result = await getAnnualReport(
      { transactions: repo },
      { userId: "u1", year: 2026, isPro: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.totalCents).toBe(10000n);
      expect(result.report.byMonth[0]).toEqual({ month: 1, totalCents: 4000n });
    }
  });

  it("excludes income (direction=in) rows from totals", async () => {
    const repo = fakeRepo([
      txn("2026-02-01T00:00:00Z", 30000n, { description: "SUPERMERCADO", direction: "out" }),
      txn("2026-02-15T00:00:00Z", 50000n, { description: "SALARIO", direction: "in" }),
    ]);
    const result = await getAnnualReport(
      { transactions: repo },
      { userId: "u1", year: 2026, isPro: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.report.totalCents).toBe(30000n);
  });

  it("excludes internal transfers and promoted rows (not real spending)", async () => {
    const repo = fakeRepo([
      txn("2026-02-01T00:00:00Z", 30000n, { description: "SUPERMERCADO" }),
      txn("2026-02-05T00:00:00Z", 80000n, { description: "PIX", category: "internal_transfer" }),
      txn("2026-02-06T00:00:00Z", 10000n, { description: "PARCELA", category: "promoted_debt" }),
    ]);
    const result = await getAnnualReport(
      { transactions: repo },
      { userId: "u1", year: 2026, isPro: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.totalCents).toBe(30000n);
      expect(result.excludedMovements).toBe(2);
      const labels = result.report.byCategory.map((c) => c.category);
      expect(labels).not.toContain("internal_transfer");
      expect(labels).not.toContain("promoted_debt");
    }
  });

  it("buckets spending into macro consumo and PT-BR categories", async () => {
    const repo = fakeRepo([
      txn("2026-01-10T00:00:00Z", 5000n, { description: "SUPERMERCADO EXTRA" }),
      txn("2026-01-12T00:00:00Z", 2000n, { description: "PARCELA 3/10 LOJA" }),
      txn("2026-01-15T00:00:00Z", 3000n, { description: "PIX ENVIADO JOAO" }),
    ]);
    const result = await getAnnualReport(
      { transactions: repo },
      { userId: "u1", year: 2026, isPro: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.consumo.essencialCents).toBe(5000n);
      expect(result.report.consumo.parceladoCents).toBe(2000n);
      expect(result.report.consumo.restoCents).toBe(3000n);
      const labels = result.report.byCategory.map((c) => c.category);
      expect(labels).toContain("Mercado");
      expect(labels).toContain("Outros");
    }
  });
});

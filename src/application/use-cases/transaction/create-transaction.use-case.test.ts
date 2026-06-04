import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { createTransaction } from "./create-transaction.use-case";

function fakeRepo() {
  const rows: unknown[] = [];
  return {
    rows,
    async create(t: {
      id: string;
      userId: string;
      occurredAt: Date;
      amount: Money;
      description: string;
      category: string | null;
      deletedAt: Date | null;
    }) {
      const persisted = { ...t, createdAt: new Date("2026-06-15T00:00:00Z") };
      rows.push(persisted);
      return persisted;
    },
    async listForUserInRange() {
      return [];
    },
  };
}

describe("createTransaction", () => {
  it("persists an expense transaction with amount, description, category, and date", async () => {
    const repo = fakeRepo();
    const clock = { now: () => new Date("2026-06-15T00:00:00Z") };
    const amount = Money.fromCents(4000n);
    const result = await createTransaction(
      { transactions: repo, clock },
      { userId: "u1", amount, description: "café", category: "alimentação", occurredAt: null },
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.amount.toCents()).toBe(4000n);
      expect(result.value.description).toBe("café");
      expect(result.value.category).toBe("alimentação");
      expect(result.value.userId).toBe("u1");
    }
    expect(repo.rows).toHaveLength(1);
  });

  it("defaults occurredAt to now and category to null when omitted", async () => {
    const repo = fakeRepo();
    const now = new Date("2026-06-15T00:00:00Z");
    const result = await createTransaction(
      { transactions: repo, clock: { now: () => now } },
      { userId: "u1", amount: Money.fromCents(1000n), description: "x", category: null, occurredAt: null },
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.occurredAt.getTime()).toBe(now.getTime());
      expect(result.value.category).toBeNull();
    }
  });
});

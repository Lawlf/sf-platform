import { describe, expect, it } from "vitest";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { listAccountTransactionsPage } from "./list-account-transactions-page.use-case";

function txn(id: string, iso: string): TransactionEntity {
  return {
    id,
    userId: "u1",
    profileId: "profile-1",
    direction: "out",
    occurredAt: new Date(iso),
    amount: Money.fromCents(1000n),
    description: "x",
    category: null,
    accountId: "acc1",
    status: "paid",
    excludedFromTotals: false,
    source: "ofx_import",
    externalId: null,
    createdAt: new Date(iso),
    deletedAt: null,
  };
}

function fakeRepo(rows: TransactionEntity[]) {
  return {
    async listByAccountPaged(
      _accountId: string,
      _profileId: string,
      opts: { limit: number; beforeOccurredAt?: Date; beforeId?: string },
    ) {
      let filtered = rows;
      if (opts.beforeOccurredAt && opts.beforeId) {
        const bo = opts.beforeOccurredAt.getTime();
        const bid = opts.beforeId;
        filtered = rows.filter(
          (r) =>
            r.occurredAt.getTime() < bo || (r.occurredAt.getTime() === bo && r.id < bid),
        );
      }
      return filtered.slice(0, opts.limit);
    },
  };
}

const rows = [
  txn("e", "2026-06-05T00:00:00Z"),
  txn("d", "2026-06-04T00:00:00Z"),
  txn("c", "2026-06-03T00:00:00Z"),
  txn("b", "2026-06-02T00:00:00Z"),
  txn("a", "2026-06-01T00:00:00Z"),
];

describe("listAccountTransactionsPage", () => {
  it("caps items at the limit and returns a cursor when more exist", async () => {
    const page = await listAccountTransactionsPage(
      { transactions: fakeRepo(rows) },
      { profileId: "profile-1", accountId: "acc1", limit: 2 },
    );
    expect(page.items.map((t) => t.id)).toEqual(["e", "d"]);
    expect(page.nextCursor).toEqual({ occurredAtIso: "2026-06-04T00:00:00.000Z", id: "d" });
  });

  it("returns null cursor on the last page", async () => {
    const page = await listAccountTransactionsPage(
      { transactions: fakeRepo(rows.slice(0, 2)) },
      { profileId: "profile-1", accountId: "acc1", limit: 5 },
    );
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("advances past the cursor", async () => {
    const page = await listAccountTransactionsPage(
      { transactions: fakeRepo(rows) },
      {
        profileId: "profile-1",
        accountId: "acc1",
        limit: 2,
        beforeOccurredAt: new Date("2026-06-04T00:00:00Z"),
        beforeId: "d",
      },
    );
    expect(page.items.map((t) => t.id)).toEqual(["c", "b"]);
    expect(page.nextCursor).toEqual({ occurredAtIso: "2026-06-02T00:00:00.000Z", id: "b" });
  });
});

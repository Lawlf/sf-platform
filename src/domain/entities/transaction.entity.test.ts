import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";

import { INCOME_SOURCES, isIncomeSource, type TransactionEntity } from "./transaction.entity";

describe("transaction entity", () => {
  it("expõe as fontes de entrada", () => {
    expect(INCOME_SOURCES).toEqual(["salary", "transfer", "gift", "refund", "sale", "other"]);
    expect(isIncomeSource("transfer")).toBe(true);
    expect(isIncomeSource("food")).toBe(false);
  });

  it("aceita um lançamento de saída pago com conta", () => {
    const t: TransactionEntity = {
      id: "t1",
      userId: "u1",
      profileId: "profile-1",
      direction: "out",
      amount: Money.fromCents(12000n),
      description: "Mercado",
      category: "Alimentação",
      accountId: "acc1",
      assetId: null,
      occurredAt: new Date("2026-06-05T00:00:00Z"),
      status: "paid",
      excludedFromTotals: false,
      source: "manual",
      externalId: null,
      createdAt: new Date("2026-06-05T00:00:00Z"),
      deletedAt: null,
    };
    expect(t.direction).toBe("out");
    expect(t.accountId).toBe("acc1");
  });

  it("aceita accountId null (legado/sem conta)", () => {
    const t: TransactionEntity = {
      id: "t2",
      userId: "u1",
      profileId: "profile-1",
      direction: "out",
      amount: Money.fromCents(100n),
      description: "x",
      category: null,
      accountId: null,
      assetId: null,
      occurredAt: new Date(),
      status: "paid",
      excludedFromTotals: false,
      source: "manual",
      externalId: null,
      createdAt: new Date(),
      deletedAt: null,
    };
    expect(t.accountId).toBeNull();
  });
});

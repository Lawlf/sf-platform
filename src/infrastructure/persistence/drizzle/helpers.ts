import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { Money, type Currency } from "@/domain/value-objects/money.vo";

type OwnedTable = {
  userId: AnyPgColumn;
  deletedAt: AnyPgColumn;
};

export function ownedBy(table: OwnedTable, userId: string): SQL {
  const cond = and(eq(table.userId, userId), isNull(table.deletedAt));
  if (!cond) throw new Error("ownedBy: condição vazia");
  return cond;
}

export function moneyFromRow(cents: bigint, currency?: string | null): Money {
  return Money.fromCents(cents, (currency ?? "BRL") as Currency);
}

import { and, between, desc, eq, isNull } from "drizzle-orm";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import {
  transactions,
  type NewTransactionRow,
  type TransactionRow,
} from "../schema/transactions.schema";

function rowToEntity(row: TransactionRow): TransactionEntity {
  return {
    id: row.id,
    userId: row.userId,
    occurredAt: row.occurredAt,
    amount: Money.fromCents(row.amountCents),
    description: row.description,
    category: row.category ?? null,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt ?? null,
  };
}

function entityToRow(entity: Omit<TransactionEntity, "createdAt">): NewTransactionRow {
  return {
    id: entity.id,
    userId: entity.userId,
    occurredAt: entity.occurredAt,
    amountCents: entity.amount.toCents(),
    description: entity.description,
    category: entity.category,
    deletedAt: entity.deletedAt,
  };
}

export class DrizzleTransactionRepository implements TransactionRepository {
  async create(transaction: Omit<TransactionEntity, "createdAt">): Promise<TransactionEntity> {
    const rows = await getDb().insert(transactions).values(entityToRow(transaction)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert transaction");
    return rowToEntity(row);
  }

  async listForUserInRange(userId: string, from: Date, to: Date): Promise<TransactionEntity[]> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          between(transactions.occurredAt, from, to),
        ),
      )
      .orderBy(desc(transactions.occurredAt));
    return rows.map(rowToEntity);
  }
}

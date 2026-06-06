import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";

import type {
  TransactionDirection,
  TransactionEntity,
  TransactionSource,
  TransactionStatus,
} from "@/domain/entities/transaction.entity";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import { type NewTransactionRow, type TransactionRow, transactions } from "../schema/transactions.schema";

function rowToEntity(row: TransactionRow): TransactionEntity {
  return {
    id: row.id,
    userId: row.userId,
    direction: row.direction as TransactionDirection,
    amount: Money.fromCents(row.amountCents),
    description: row.description,
    category: row.category ?? null,
    accountId: row.accountId ?? null,
    occurredAt: row.occurredAt,
    status: row.status as TransactionStatus,
    source: row.source as TransactionSource,
    externalId: row.externalId ?? null,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt ?? null,
  };
}

function entityToRow(entity: Omit<TransactionEntity, "createdAt">): NewTransactionRow {
  return {
    id: entity.id,
    userId: entity.userId,
    direction: entity.direction,
    amountCents: entity.amount.toCents(),
    description: entity.description,
    category: entity.category,
    accountId: entity.accountId,
    occurredAt: entity.occurredAt,
    status: entity.status,
    source: entity.source,
    externalId: entity.externalId,
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

  async update(transaction: TransactionEntity): Promise<TransactionEntity> {
    const rows = await getDb()
      .update(transactions)
      .set(entityToRow(transaction))
      .where(eq(transactions.id, transaction.id))
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to update transaction");
    return rowToEntity(row);
  }

  async findByIdForUser(id: string, userId: string): Promise<TransactionEntity | null> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listByAccount(accountId: string, userId: string): Promise<TransactionEntity[]> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(and(eq(transactions.accountId, accountId), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.occurredAt));
    return rows.map(rowToEntity);
  }

  async listForUserInRange(userId: string, from: Date, to: Date): Promise<TransactionEntity[]> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredAt, from),
          lte(transactions.occurredAt, to),
          isNull(transactions.deletedAt),
        ),
      )
      .orderBy(desc(transactions.occurredAt));
    return rows.map(rowToEntity);
  }

  async softDelete(id: string, deletedAt: Date): Promise<void> {
    await getDb().update(transactions).set({ deletedAt }).where(eq(transactions.id, id));
  }
}

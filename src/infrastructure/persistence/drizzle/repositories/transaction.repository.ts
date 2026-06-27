import { and, count, desc, eq, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";


import type {
  TransactionDirection,
  TransactionEntity,
  TransactionSource,
  TransactionStatus,
} from "@/domain/entities/transaction.entity";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { type Currency, Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import { scopedToProfile } from "../helpers";
import { type NewTransactionRow, type TransactionRow, transactions } from "../schema/transactions.schema";

function rowToEntity(row: TransactionRow): TransactionEntity {
  return {
    id: row.id,
    userId: row.userId,
    profileId: row.profileId,
    direction: row.direction as TransactionDirection,
    amount: Money.fromCents(row.amountCents, row.currency as Currency),
    description: row.description,
    category: row.category ?? null,
    accountId: row.accountId ?? null,
    assetId: row.assetId ?? null,
    occurredAt: row.occurredAt,
    status: row.status as TransactionStatus,
    excludedFromTotals: row.excludedFromTotals,
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
    profileId: entity.profileId,
    direction: entity.direction,
    amountCents: entity.amount.toCents(),
    currency: entity.amount.currency,
    description: entity.description,
    category: entity.category,
    accountId: entity.accountId,
    assetId: entity.assetId,
    occurredAt: entity.occurredAt,
    status: entity.status,
    excludedFromTotals: entity.excludedFromTotals,
    source: entity.source,
    externalId: entity.externalId,
    deletedAt: entity.deletedAt,
  };
}

export class TransactionRepository implements TransactionRepositoryPort {
  async create(transaction: Omit<TransactionEntity, "createdAt">): Promise<TransactionEntity> {
    // Idempotente no índice parcial (profile_id, external_id): em uma corrida de
    // double-commit do OFX o segundo insert do mesmo fitId vira no-op em vez de
    // duplicar. Lançamentos manuais (external_id nulo) não batem no índice e
    // seguem o insert normal.
    const rows = await getDb()
      .insert(transactions)
      .values(entityToRow(transaction))
      .onConflictDoNothing()
      .returning();
    const row = rows[0];
    if (row) return rowToEntity(row);
    // Conflito: a transação já existe (corrida). Devolve a existente para o
    // caller seguir sem erro.
    if (transaction.externalId) {
      const existing = await getDb()
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.profileId, transaction.profileId),
            eq(transactions.externalId, transaction.externalId),
          ),
        )
        .limit(1);
      if (existing[0]) return rowToEntity(existing[0]);
    }
    throw new Error("Failed to insert transaction");
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

  async findByIdForProfile(id: string, profileId: string): Promise<TransactionEntity | null> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), scopedToProfile(transactions, profileId)))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listByAccount(accountId: string, profileId: string): Promise<TransactionEntity[]> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(and(eq(transactions.accountId, accountId), scopedToProfile(transactions, profileId)))
      .orderBy(desc(transactions.occurredAt));
    return rows.map(rowToEntity);
  }

  async listByAccountPaged(
    accountId: string,
    profileId: string,
    opts: { limit: number; beforeOccurredAt?: Date; beforeId?: string },
  ): Promise<TransactionEntity[]> {
    const base = and(
      eq(transactions.accountId, accountId),
      eq(transactions.profileId, profileId),
      isNull(transactions.deletedAt),
    );
    const cursor =
      opts.beforeOccurredAt && opts.beforeId
        ? or(
            lt(transactions.occurredAt, opts.beforeOccurredAt),
            and(
              eq(transactions.occurredAt, opts.beforeOccurredAt),
              lt(transactions.id, opts.beforeId),
            ),
          )
        : undefined;
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(cursor ? and(base, cursor) : base)
      .orderBy(desc(transactions.occurredAt), desc(transactions.id))
      .limit(opts.limit);
    return rows.map(rowToEntity);
  }

  async monthSummariesByAccount(
    accountId: string,
    profileId: string,
  ): Promise<Array<{ key: string; inCents: bigint; outCents: bigint; currency: string }>> {
    const rows = await getDb()
      .select({
        occurredAt: transactions.occurredAt,
        direction: transactions.direction,
        amountCents: transactions.amountCents,
        currency: transactions.currency,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.profileId, profileId),
          isNull(transactions.deletedAt),
        ),
      );

    const map = new Map<string, { inCents: bigint; outCents: bigint; currency: string }>();
    for (const r of rows) {
      const key = r.occurredAt.toISOString().slice(0, 7);
      let g = map.get(key);
      if (!g) {
        g = { inCents: 0n, outCents: 0n, currency: r.currency };
        map.set(key, g);
      }
      const c = r.amountCents;
      if (r.direction === "in") g.inCents += c;
      else g.outCents += c;
    }

    return [...map.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  }

  async countByAccount(accountId: string, profileId: string): Promise<number> {
    const rows = await getDb()
      .select({ value: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.profileId, profileId),
          isNull(transactions.deletedAt),
        ),
      );
    return rows[0]?.value ?? 0;
  }

  async listForProfileInRange(profileId: string, from: Date, to: Date): Promise<TransactionEntity[]> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.profileId, profileId),
          gte(transactions.occurredAt, from),
          lte(transactions.occurredAt, to),
          isNull(transactions.deletedAt),
        ),
      )
      .orderBy(desc(transactions.occurredAt));
    return rows.map(rowToEntity);
  }

  async listByAttributedAsset(assetId: string, profileId: string): Promise<TransactionEntity[]> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.assetId, assetId),
          eq(transactions.profileId, profileId),
          isNull(transactions.deletedAt),
        ),
      )
      .orderBy(desc(transactions.occurredAt));
    return rows.map(rowToEntity);
  }

  async listDueScheduled(asOf: Date): Promise<TransactionEntity[]> {
    const rows = await getDb()
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "scheduled"),
          lte(transactions.occurredAt, asOf),
          isNull(transactions.deletedAt),
        ),
      )
      .orderBy(transactions.occurredAt);
    return rows.map(rowToEntity);
  }

  async setCategoryForIds(profileId: string, ids: string[], category: string | null): Promise<void> {
    if (ids.length === 0) return;
    await getDb()
      .update(transactions)
      .set({ category })
      .where(and(eq(transactions.profileId, profileId), inArray(transactions.id, ids)));
  }

  async setExcludedForIds(profileId: string, ids: string[], excluded: boolean): Promise<void> {
    if (ids.length === 0) return;
    await getDb()
      .update(transactions)
      .set({ excludedFromTotals: excluded })
      .where(and(eq(transactions.profileId, profileId), inArray(transactions.id, ids)));
  }

  async softDelete(id: string, deletedAt: Date): Promise<void> {
    await getDb().update(transactions).set({ deletedAt }).where(eq(transactions.id, id));
  }

  async countByCategory(profileId: string, categoryKey: string): Promise<number> {
    const rows = await getDb()
      .select({ value: count() })
      .from(transactions)
      .where(and(eq(transactions.category, categoryKey), scopedToProfile(transactions, profileId)));
    return rows[0]?.value ?? 0;
  }

  async reassignCategory(profileId: string, fromKey: string, toKey: string): Promise<void> {
    await getDb()
      .update(transactions)
      .set({ category: toKey })
      .where(and(eq(transactions.category, fromKey), scopedToProfile(transactions, profileId)));
  }

  async existingExternalIds(profileId: string, externalIds: string[]): Promise<string[]> {
    if (externalIds.length === 0) return [];
    const rows = await getDb()
      .select({ externalId: transactions.externalId })
      .from(transactions)
      .where(
        and(
          eq(transactions.profileId, profileId),
          inArray(transactions.externalId, externalIds),
        ),
      );
    return rows.map((r) => r.externalId).filter((v): v is string => v !== null);
  }
}

"use server";

import { listAccountTransactionsPage } from "@/application/use-cases/transaction/list-account-transactions-page.use-case";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { transactionCategoryLabel } from "@/domain/services/transaction-category-label";
import { DrizzleTransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-transaction.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export interface SerializedAccountTxn {
  id: string;
  description: string;
  categoryLabel: string | null;
  direction: "in" | "out";
  amountFormatted: string;
  amountCents: string;
  currency: string;
  occurredAtIso: string;
}

export interface AccountTxnPagePayload {
  items: SerializedAccountTxn[];
  nextCursor: { occurredAtIso: string; id: string } | null;
}

const DEFAULT_PAGE_LIMIT = 30;

function serialize(t: TransactionEntity): SerializedAccountTxn {
  return {
    id: t.id,
    description: t.description,
    categoryLabel: transactionCategoryLabel(t.category),
    direction: t.direction,
    amountFormatted: t.amount.format(),
    amountCents: t.amount.toCents().toString(),
    currency: t.amount.currency,
    occurredAtIso: t.occurredAt.toISOString(),
  };
}

export async function fetchAccountTransactionsPage(args: {
  accountId: string;
  limit?: number;
  beforeOccurredAtIso?: string;
  beforeId?: string;
}): Promise<AccountTxnPagePayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const page = await listAccountTransactionsPage(
    { transactions: new DrizzleTransactionRepository() },
    {
      userId: user.id,
      accountId: args.accountId,
      limit: args.limit ?? DEFAULT_PAGE_LIMIT,
      ...(args.beforeOccurredAtIso && args.beforeId
        ? { beforeOccurredAt: new Date(args.beforeOccurredAtIso), beforeId: args.beforeId }
        : {}),
    },
  );

  return { items: page.items.map(serialize), nextCursor: page.nextCursor };
}

export async function fetchAccountTransactionCount(accountId: string): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return new DrizzleTransactionRepository().countByAccount(accountId, user.id);
}

export interface AccountMonthSummary {
  key: string;
  inCents: string;
  outCents: string;
  currency: string;
}

export async function fetchAccountMonthSummaries(
  accountId: string,
): Promise<AccountMonthSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await new DrizzleTransactionRepository().monthSummariesByAccount(accountId, user.id);
  return rows.map((r) => ({
    key: r.key,
    inCents: r.inCents.toString(),
    outCents: r.outCents.toString(),
    currency: r.currency,
  }));
}

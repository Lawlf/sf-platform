"use server";

import { listAccountTransactionsPage } from "@/application/use-cases/transaction/list-account-transactions-page.use-case";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { buildCategoryLabeler, type CategoryLabeler } from "../../../_actions/_category-labels";

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

function serialize(t: TransactionEntity, labelCategory: CategoryLabeler): SerializedAccountTxn {
  return {
    id: t.id,
    description: t.description,
    categoryLabel: labelCategory(t.category),
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
    { transactions: repos.transactions },
    {
      userId: user.id,
      accountId: args.accountId,
      limit: args.limit ?? DEFAULT_PAGE_LIMIT,
      ...(args.beforeOccurredAtIso && args.beforeId
        ? { beforeOccurredAt: new Date(args.beforeOccurredAtIso), beforeId: args.beforeId }
        : {}),
    },
  );

  const labelCategory = await buildCategoryLabeler(user.id);
  return {
    items: page.items.map((t) => serialize(t, labelCategory)),
    nextCursor: page.nextCursor,
  };
}

export async function fetchAccountTransactionCount(accountId: string): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return repos.transactions.countByAccount(accountId, user.id);
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
  const rows = await repos.transactions.monthSummariesByAccount(accountId, user.id);
  return rows.map((r) => ({
    key: r.key,
    inCents: r.inCents.toString(),
    outCents: r.outCents.toString(),
    currency: r.currency,
  }));
}

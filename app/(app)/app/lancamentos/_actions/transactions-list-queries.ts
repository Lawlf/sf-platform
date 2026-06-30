"use server";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { resolveStatusForDate } from "@/domain/services/transaction-forecast";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { buildCategoryLabeler, type CategoryLabeler } from "../../_actions/_category-labels";

export interface SerializedTxn {
  id: string;
  description: string;
  categoryKey: string | null;
  categoryLabel: string | null;
  direction: "in" | "out";
  amountFormatted: string;
  amountCents: string;
  currency: string;
  occurredAtIso: string;
  status: "paid" | "scheduled";
  excludedFromTotals: boolean;
  accountId: string | null;
}

function serialize(t: TransactionEntity, labelCategory: CategoryLabeler): SerializedTxn {
  return {
    id: t.id,
    description: t.description,
    categoryKey: t.category,
    categoryLabel: labelCategory(t.category),
    direction: t.direction,
    amountFormatted: t.amount.format(),
    amountCents: t.amount.toCents().toString(),
    currency: t.amount.currency,
    occurredAtIso: t.occurredAt.toISOString(),
    // Data futura é sempre previsto, mesmo que uma linha antiga tenha ficado
    // marcada como paga: ninguém paga algo que ainda não chegou.
    status: resolveStatusForDate(t.status, t.occurredAt, clock.now()),
    excludedFromTotals: t.excludedFromTotals,
    accountId: t.accountId,
  };
}

export async function fetchTransactionsForRange(args: {
  fromIso: string;
  toIso: string;
}): Promise<SerializedTxn[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const profileId = await getActiveProfileId();

  const rows = await repos.transactions.listForProfileInRange(
    profileId,
    new Date(args.fromIso),
    new Date(args.toIso),
  );
  const labelCategory = await buildCategoryLabeler(user.id);
  return rows
    .map((t) => serialize(t, labelCategory))
    .sort((a, b) => b.occurredAtIso.localeCompare(a.occurredAtIso));
}

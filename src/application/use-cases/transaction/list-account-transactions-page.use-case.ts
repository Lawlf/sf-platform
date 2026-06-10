import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";

export interface ListAccountTransactionsPageDeps {
  transactions: Pick<TransactionRepository, "listByAccountPaged">;
}

export interface ListAccountTransactionsPageInput {
  userId: string;
  accountId: string;
  limit: number;
  beforeOccurredAt?: Date;
  beforeId?: string;
}

export interface AccountTransactionsPage {
  items: TransactionEntity[];
  nextCursor: { occurredAtIso: string; id: string } | null;
}

export async function listAccountTransactionsPage(
  deps: ListAccountTransactionsPageDeps,
  input: ListAccountTransactionsPageInput,
): Promise<AccountTransactionsPage> {
  const opts =
    input.beforeOccurredAt && input.beforeId
      ? { limit: input.limit + 1, beforeOccurredAt: input.beforeOccurredAt, beforeId: input.beforeId }
      : { limit: input.limit + 1 };
  const rows = await deps.transactions.listByAccountPaged(input.accountId, input.userId, opts);
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? { occurredAtIso: last.occurredAt.toISOString(), id: last.id } : null;
  return { items, nextCursor };
}

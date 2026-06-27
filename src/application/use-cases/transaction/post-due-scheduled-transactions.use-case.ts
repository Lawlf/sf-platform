import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";

export interface PostDueScheduledTransactionsDeps {
  transactions: Pick<TransactionRepositoryPort, "listDueScheduled" | "update">;
  assets: Pick<AssetRepositoryPort, "findById" | "update">;
  clock: Clock;
}

export interface PostDueScheduledResult {
  postedCount: number;
  skippedCount: number;
}

/**
 * Posta os lançamentos agendados cujo dia chegou: move o saldo da conta e marca
 * a transação como paga. Idempotente por status (uma transação já paga não é
 * relistada). Espelha a postagem imediata do create-transaction.
 */
export async function postDueScheduledTransactions(
  deps: PostDueScheduledTransactionsDeps,
  input: { asOf?: Date } = {},
): Promise<PostDueScheduledResult> {
  const asOf = input.asOf ?? deps.clock.now();
  const due = await deps.transactions.listDueScheduled(asOf);

  let postedCount = 0;
  let skippedCount = 0;
  for (const txn of due) {
    if (txn.status !== "scheduled" || !txn.accountId || txn.excludedFromTotals) {
      skippedCount += 1;
      continue;
    }
    const account = await deps.assets.findById(txn.accountId, txn.profileId);
    if (!account || account.category !== "cash") {
      skippedCount += 1;
      continue;
    }
    const next: AssetEntity = {
      ...account,
      currentValue:
        txn.direction === "out"
          ? account.currentValue.subtract(txn.amount)
          : account.currentValue.add(txn.amount),
      updatedAt: deps.clock.now(),
    };
    await deps.assets.update(next);
    await deps.transactions.update({ ...txn, status: "paid" });
    postedCount += 1;
  }

  return { postedCount, skippedCount };
}

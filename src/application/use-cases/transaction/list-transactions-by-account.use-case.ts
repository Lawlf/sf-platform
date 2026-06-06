import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";

export interface ListTransactionsByAccountDeps {
  transactions: Pick<TransactionRepository, "listByAccount">;
}

export async function listTransactionsByAccount(
  deps: ListTransactionsByAccountDeps,
  input: { userId: string; accountId: string },
): Promise<TransactionEntity[]> {
  return deps.transactions.listByAccount(input.accountId, input.userId);
}

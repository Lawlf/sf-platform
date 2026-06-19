import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";

export interface ListTransactionsByAccountDeps {
  transactions: Pick<TransactionRepositoryPort, "listByAccount">;
}

export async function listTransactionsByAccount(
  deps: ListTransactionsByAccountDeps,
  input: { profileId: string; accountId: string },
): Promise<TransactionEntity[]> {
  return deps.transactions.listByAccount(input.accountId, input.profileId);
}

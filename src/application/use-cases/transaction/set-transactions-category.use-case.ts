import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface SetTransactionsCategoryDeps {
  transactions: Pick<TransactionRepositoryPort, "setCategoryForIds">;
}

/**
 * Aplica uma categoria a vários lançamentos de uma vez. Categoria é metadado
 * puro (não mexe saldo), então é um update direto, scoped por perfil no repo.
 */
export async function setTransactionsCategory(
  deps: SetTransactionsCategoryDeps,
  input: { profileId: string; transactionIds: string[]; category: string | null },
): Promise<Result<{ count: number }, never>> {
  const ids = [...new Set(input.transactionIds)];
  if (ids.length === 0) return ok({ count: 0 });
  await deps.transactions.setCategoryForIds(input.profileId, ids, input.category);
  return ok({ count: ids.length });
}

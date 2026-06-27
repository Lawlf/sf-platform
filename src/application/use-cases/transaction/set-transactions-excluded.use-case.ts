import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface SetTransactionsExcludedDeps {
  transactions: Pick<TransactionRepositoryPort, "setExcludedForIds">;
}

/**
 * Marca/desmarca "não contar no mês" em vários lançamentos. Tira (ou devolve) do
 * cálculo de fluxo sem apagar nem mexer no saldo. Update direto, scoped por perfil.
 */
export async function setTransactionsExcluded(
  deps: SetTransactionsExcludedDeps,
  input: { profileId: string; transactionIds: string[]; excluded: boolean },
): Promise<Result<{ count: number }, never>> {
  const ids = [...new Set(input.transactionIds)];
  if (ids.length === 0) return ok({ count: 0 });
  await deps.transactions.setExcludedForIds(input.profileId, ids, input.excluded);
  return ok({ count: ids.length });
}

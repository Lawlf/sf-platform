import { Forbidden } from "@/domain/errors/auth-errors";
import { TransactionNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface DeleteTransactionDeps {
  transactions: Pick<TransactionRepositoryPort, "findByIdForProfile" | "softDelete">;
  assets: Pick<AssetRepositoryPort, "findById" | "update">;
  clock: Clock;
  transaction?: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Apaga (soft-delete) um lançamento avulso. Se já estava pago, reverte o efeito
 * no saldo da conta: saída devolve o valor, entrada retira. Agendado nunca
 * postou, então só some o registro. Reversão de saldo + soft-delete num passo só.
 */
export async function deleteTransaction(
  deps: DeleteTransactionDeps,
  input: { profileId: string; transactionId: string },
): Promise<Result<void, TransactionNotFound | Forbidden>> {
  const existing = await deps.transactions.findByIdForProfile(input.transactionId, input.profileId);
  if (!existing) return err(new TransactionNotFound("Lançamento não encontrado."));
  if (existing.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  const now = deps.clock.now();
  const run = deps.transaction ?? ((fn) => fn());
  await run(async () => {
    if (existing.status === "paid" && existing.accountId) {
      const account = await deps.assets.findById(existing.accountId, input.profileId);
      if (account && account.category === "cash") {
        const reversed =
          existing.direction === "out"
            ? account.currentValue.add(existing.amount)
            : account.currentValue.subtract(existing.amount);
        await deps.assets.update({ ...account, currentValue: reversed, updatedAt: now });
      }
    }
    await deps.transactions.softDelete(existing.id, now);
  });

  return ok(undefined);
}

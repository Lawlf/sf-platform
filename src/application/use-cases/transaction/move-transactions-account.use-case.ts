import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface MoveTransactionsAccountDeps {
  transactions: Pick<TransactionRepositoryPort, "findByIdForProfile" | "update">;
  assets: Pick<AssetRepositoryPort, "findById" | "update">;
  clock: Clock;
  transaction?: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Move vários lançamentos pra outra conta. Pago já mexeu o saldo na conta antiga;
 * mover devolve pra antiga e aplica na nova (mesma moeda). Agendado só troca de
 * conta (não postou). Saldos das contas afetadas escritos uma vez no fim, atômico.
 */
export async function moveTransactionsAccount(
  deps: MoveTransactionsAccountDeps,
  input: { profileId: string; transactionIds: string[]; targetAccountId: string },
): Promise<Result<{ count: number }, Forbidden>> {
  const accounts = new Map<string, AssetEntity>();
  const touched = new Set<string>();

  async function loadAccount(id: string): Promise<AssetEntity | null> {
    if (!accounts.has(id)) {
      const a = await deps.assets.findById(id, input.profileId);
      if (a) accounts.set(id, a);
    }
    return accounts.get(id) ?? null;
  }

  const target = await loadAccount(input.targetAccountId);
  if (!target || target.profileId !== input.profileId || target.category !== "cash") {
    return err(new Forbidden("Conta inválida."));
  }

  const ids = [...new Set(input.transactionIds)];
  const run = deps.transaction ?? ((fn) => fn());
  const count = await run(async () => {
    let moved = 0;
    for (const id of ids) {
      const txn = await deps.transactions.findByIdForProfile(id, input.profileId);
      if (!txn || txn.profileId !== input.profileId) continue;
      if (txn.accountId === input.targetAccountId) continue;

      if (txn.status === "paid" && txn.accountId) {
        const old = await loadAccount(txn.accountId);
        const cur = txn.amount.currency;
        if (
          old &&
          old.category === "cash" &&
          old.currentValue.currency === cur &&
          accounts.get(input.targetAccountId)!.currentValue.currency === cur
        ) {
          const reversed =
            txn.direction === "out"
              ? old.currentValue.add(txn.amount)
              : old.currentValue.subtract(txn.amount);
          accounts.set(old.id, { ...old, currentValue: reversed });
          touched.add(old.id);
          const t = accounts.get(input.targetAccountId)!;
          const applied =
            txn.direction === "out"
              ? t.currentValue.subtract(txn.amount)
              : t.currentValue.add(txn.amount);
          accounts.set(input.targetAccountId, { ...t, currentValue: applied });
          touched.add(input.targetAccountId);
        }
      }

      await deps.transactions.update({ ...txn, accountId: input.targetAccountId });
      moved += 1;
    }

    for (const id of touched) {
      const a = accounts.get(id);
      if (a) await deps.assets.update({ ...a, updatedAt: deps.clock.now() });
    }
    return moved;
  });

  return ok({ count });
}

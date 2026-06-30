import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { TransactionNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { resolveStatusForDate } from "@/domain/services/transaction-forecast";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface UpdateTransactionDeps {
  transactions: Pick<TransactionRepositoryPort, "findByIdForProfile" | "update">;
  assets: Pick<AssetRepositoryPort, "findById" | "update">;
  clock: Clock;
  transaction?: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface UpdateTransactionInput {
  profileId: string;
  transactionId: string;
  category: string | null;
  description?: string;
  /** Novo valor em centavos. Mantém a moeda original. Omitido = não muda. */
  amountCents?: bigint;
  /** Nova data. Omitido = não muda. */
  occurredAt?: Date;
  /** Patrimônio atribuído. Omitido = não muda; null = desatrela. Só metadado, não mexe saldo. */
  assetId?: string | null;
}

/**
 * Edita um lançamento avulso. Categoria/descrição/data são metadados. Mudar o
 * VALOR de um lançamento pago reconcilia o saldo da conta pela diferença (saída
 * reduz, entrada soma), pra o saldo nunca herdar um valor errado. Agendado não
 * mexe saldo (ainda não postou).
 */
export async function updateTransaction(
  deps: UpdateTransactionDeps,
  input: UpdateTransactionInput,
): Promise<Result<TransactionEntity, TransactionNotFound | Forbidden>> {
  const existing = await deps.transactions.findByIdForProfile(input.transactionId, input.profileId);
  if (!existing) return err(new TransactionNotFound("Lançamento não encontrado."));
  if (existing.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  const description = input.description?.trim();
  const newAmount =
    input.amountCents !== undefined
      ? Money.fromCents(input.amountCents, existing.amount.currency)
      : existing.amount;

  const occurredAt = input.occurredAt ?? existing.occurredAt;
  const newStatus = resolveStatusForDate(existing.status, occurredAt, deps.clock.now());

  const updated: TransactionEntity = {
    ...existing,
    category: input.category,
    description: description && description.length > 0 ? description : existing.description,
    amount: newAmount,
    occurredAt,
    status: newStatus,
    assetId: input.assetId !== undefined ? input.assetId : existing.assetId,
  };

  const prevApplied =
    existing.status === "paid" ? signedEffect(existing.direction, existing.amount.toCents()) : 0n;
  const nextApplied =
    newStatus === "paid" ? signedEffect(existing.direction, newAmount.toCents()) : 0n;
  const deltaCents = nextApplied - prevApplied;
  const needsBalanceReconcile = deltaCents !== 0n && existing.accountId !== null;

  const run = deps.transaction ?? ((fn) => fn());
  const persisted = await run(async () => {
    if (needsBalanceReconcile && existing.accountId) {
      const account = await deps.assets.findById(existing.accountId, input.profileId);
      if (account && account.category === "cash") {
        const nextValue = account.currentValue.add(
          Money.fromCents(deltaCents, account.currentValue.currency),
        );
        await deps.assets.update({
          ...account,
          currentValue: nextValue,
          updatedAt: deps.clock.now(),
        });
      }
    }
    return deps.transactions.update(updated);
  });

  return ok(persisted);
}

function signedEffect(direction: "in" | "out", cents: bigint): bigint {
  return direction === "out" ? -cents : cents;
}

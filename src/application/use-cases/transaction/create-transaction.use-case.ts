import crypto from "node:crypto";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type {
  TransactionDirection,
  TransactionEntity,
  TransactionSource,
  TransactionStatus,
} from "@/domain/entities/transaction.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import { buildDefaultWallet } from "@/domain/services/default-wallet.factory";
import type { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors/result";

export interface CreateTransactionDeps {
  transactions: Pick<TransactionRepository, "create">;
  assets: Pick<AssetRepository, "findById" | "findActiveByUserAndCategory" | "create" | "update">;
  clock: Clock;
}

export interface CreateTransactionInput {
  userId: string;
  direction: TransactionDirection;
  amount: Money;
  description: string;
  category: string | null;
  accountId: string | null;
  occurredAt: Date | null;
  status?: TransactionStatus;
  source?: TransactionSource;
  externalId?: string | null;
}

async function resolveAccount(
  deps: CreateTransactionDeps,
  userId: string,
  accountId: string | null,
): Promise<AssetEntity> {
  if (accountId) {
    const found = await deps.assets.findById(accountId, userId);
    if (found && found.category === "cash") return found;
  }
  const existing = await deps.assets.findActiveByUserAndCategory(userId, "cash");
  if (existing[0]) return existing[0];
  const wallet = buildDefaultWallet(userId, crypto.randomUUID(), deps.clock.now());
  await deps.assets.create(wallet);
  return wallet;
}

export async function createTransaction(
  deps: CreateTransactionDeps,
  input: CreateTransactionInput,
): Promise<Result<TransactionEntity, never>> {
  const status = input.status ?? "paid";
  const account = await resolveAccount(deps, input.userId, input.accountId);

  if (status === "paid") {
    const next =
      input.direction === "out"
        ? account.currentValue.subtract(input.amount)
        : account.currentValue.add(input.amount);
    await deps.assets.update({ ...account, currentValue: next, updatedAt: deps.clock.now() });
  }

  const persisted = await deps.transactions.create({
    id: crypto.randomUUID(),
    userId: input.userId,
    direction: input.direction,
    amount: input.amount,
    description: input.description,
    category: input.category,
    accountId: account.id,
    occurredAt: input.occurredAt ?? deps.clock.now(),
    status,
    source: input.source ?? "manual",
    externalId: input.externalId ?? null,
    deletedAt: null,
  });
  return ok(persisted);
}

import crypto from "node:crypto";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type {
  TransactionDirection,
  TransactionEntity,
  TransactionSource,
  TransactionStatus,
} from "@/domain/entities/transaction.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { buildDefaultWallet } from "@/domain/services/default-wallet.factory";
import type { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors/result";

export interface CreateTransactionDeps {
  transactions: Pick<TransactionRepositoryPort, "create">;
  assets: Pick<
    AssetRepositoryPort,
    "findById" | "findActiveByProfileAndCategory" | "createDefaultWallet" | "update"
  >;
  clock: Clock;
}

export interface CreateTransactionInput {
  userId: string;
  profileId: string;
  direction: TransactionDirection;
  amount: Money;
  description: string;
  category: string | null;
  accountId: string | null;
  assetId?: string | null;
  occurredAt: Date | null;
  status?: TransactionStatus;
  source?: TransactionSource;
  externalId?: string | null;
}

async function resolveAccount(
  deps: CreateTransactionDeps,
  userId: string,
  profileId: string,
  accountId: string | null,
): Promise<AssetEntity> {
  if (accountId) {
    const found = await deps.assets.findById(accountId, profileId);
    if (found && found.category === "cash") return found;
  }
  const existing = await deps.assets.findActiveByProfileAndCategory(profileId, "cash");
  const carteira = existing.find((a) => a.label === "Carteira");
  if (carteira) return carteira;
  const wallet = buildDefaultWallet(userId, profileId, crypto.randomUUID(), deps.clock.now());
  await deps.assets.createDefaultWallet(wallet);
  const after = await deps.assets.findActiveByProfileAndCategory(profileId, "cash");
  return after.find((a) => a.label === "Carteira") ?? wallet;
}

export async function createTransaction(
  deps: CreateTransactionDeps,
  input: CreateTransactionInput,
): Promise<Result<TransactionEntity, never>> {
  const status = input.status ?? "paid";
  const account = await resolveAccount(deps, input.userId, input.profileId, input.accountId);

  const amount =
    input.amount.currency === account.currentValue.currency
      ? input.amount
      : input.amount.convert(1, account.currentValue.currency);

  if (status === "paid") {
    const next =
      input.direction === "out"
        ? account.currentValue.subtract(amount)
        : account.currentValue.add(amount);
    await deps.assets.update({ ...account, currentValue: next, updatedAt: deps.clock.now() });
  }

  const persisted = await deps.transactions.create({
    id: crypto.randomUUID(),
    userId: input.userId,
    profileId: input.profileId,
    direction: input.direction,
    amount,
    description: input.description,
    category: input.category,
    accountId: account.id,
    assetId: input.assetId ?? null,
    occurredAt: input.occurredAt ?? deps.clock.now(),
    status,
    excludedFromTotals: false,
    source: input.source ?? "manual",
    externalId: input.externalId ?? null,
    deletedAt: null,
  });
  return ok(persisted);
}

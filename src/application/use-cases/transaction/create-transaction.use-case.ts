import crypto from "node:crypto";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import type { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors/result";

export interface CreateTransactionDeps {
  transactions: TransactionRepository;
  clock: Clock;
}

export interface CreateTransactionInput {
  userId: string;
  amount: Money;
  description: string;
  category: string | null;
  occurredAt: Date | null;
}

export async function createTransaction(
  deps: CreateTransactionDeps,
  input: CreateTransactionInput,
): Promise<Result<TransactionEntity, never>> {
  const persisted = await deps.transactions.create({
    id: crypto.randomUUID(),
    userId: input.userId,
    occurredAt: input.occurredAt ?? deps.clock.now(),
    amount: input.amount,
    description: input.description,
    category: input.category,
    deletedAt: null,
  });
  return ok(persisted);
}

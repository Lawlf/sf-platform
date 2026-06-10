import type { TransactionEntity } from "@/domain/entities/transaction.entity";

export interface TransactionRepository {
  create(transaction: Omit<TransactionEntity, "createdAt">): Promise<TransactionEntity>;
  update(transaction: TransactionEntity): Promise<TransactionEntity>;
  findByIdForUser(id: string, userId: string): Promise<TransactionEntity | null>;
  listByAccount(accountId: string, userId: string): Promise<TransactionEntity[]>;
  listByAccountPaged(
    accountId: string,
    userId: string,
    opts: { limit: number; beforeOccurredAt?: Date; beforeId?: string },
  ): Promise<TransactionEntity[]>;
  countByAccount(accountId: string, userId: string): Promise<number>;
  monthSummariesByAccount(
    accountId: string,
    userId: string,
  ): Promise<Array<{ key: string; inCents: bigint; outCents: bigint; currency: string }>>;
  listForUserInRange(userId: string, from: Date, to: Date): Promise<TransactionEntity[]>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  existingExternalIds(userId: string, externalIds: string[]): Promise<string[]>;
}

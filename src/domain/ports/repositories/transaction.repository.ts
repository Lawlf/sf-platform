import type { TransactionEntity } from "@/domain/entities/transaction.entity";

export interface TransactionRepositoryPort {
  create(transaction: Omit<TransactionEntity, "createdAt">): Promise<TransactionEntity>;
  update(transaction: TransactionEntity): Promise<TransactionEntity>;
  findByIdForProfile(id: string, profileId: string): Promise<TransactionEntity | null>;
  listByAccount(accountId: string, profileId: string): Promise<TransactionEntity[]>;
  listByAccountPaged(
    accountId: string,
    profileId: string,
    opts: { limit: number; beforeOccurredAt?: Date; beforeId?: string },
  ): Promise<TransactionEntity[]>;
  countByAccount(accountId: string, profileId: string): Promise<number>;
  monthSummariesByAccount(
    accountId: string,
    profileId: string,
  ): Promise<Array<{ key: string; inCents: bigint; outCents: bigint; currency: string }>>;
  listForProfileInRange(profileId: string, from: Date, to: Date): Promise<TransactionEntity[]>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  existingExternalIds(profileId: string, externalIds: string[]): Promise<string[]>;
  countByCategory(profileId: string, categoryKey: string): Promise<number>;
  reassignCategory(profileId: string, fromKey: string, toKey: string): Promise<void>;
}

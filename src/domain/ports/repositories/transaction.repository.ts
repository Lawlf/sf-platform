import type { TransactionEntity } from "@/domain/entities/transaction.entity";

export interface TransactionRepository {
  create(transaction: Omit<TransactionEntity, "createdAt">): Promise<TransactionEntity>;
  update(transaction: TransactionEntity): Promise<TransactionEntity>;
  findByIdForUser(id: string, userId: string): Promise<TransactionEntity | null>;
  listByAccount(accountId: string, userId: string): Promise<TransactionEntity[]>;
  listForUserInRange(userId: string, from: Date, to: Date): Promise<TransactionEntity[]>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  existingExternalIds(userId: string, externalIds: string[]): Promise<string[]>;
}

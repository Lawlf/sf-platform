import type { TransactionEntity } from "@/domain/entities/transaction.entity";

export interface TransactionRepository {
  create(transaction: Omit<TransactionEntity, "createdAt">): Promise<TransactionEntity>;
  listForUserInRange(userId: string, from: Date, to: Date): Promise<TransactionEntity[]>;
}

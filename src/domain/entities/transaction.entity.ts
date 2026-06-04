import type { Money } from "@/domain/value-objects/money.vo";

export interface TransactionEntity {
  id: string;
  userId: string;
  occurredAt: Date;
  amount: Money;
  description: string;
  category: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

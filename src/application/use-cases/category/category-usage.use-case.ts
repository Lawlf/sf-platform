import type { CategoryDomain } from "@/domain/categories/default-categories";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";

export interface CategoryUsage {
  transactions: number;
  debts: number;
}

export async function categoryUsage(
  deps: {
    transactions: Pick<TransactionRepositoryPort, "countByCategory">;
    debts: Pick<DebtRepositoryPort, "countByExpenseCategory">;
  },
  { userId, domain, key }: { userId: string; domain: CategoryDomain; key: string },
): Promise<CategoryUsage> {
  const transactions = await deps.transactions.countByCategory(userId, key);
  const debts =
    domain === "expense" ? await deps.debts.countByExpenseCategory(userId, key) : 0;
  return { transactions, debts };
}

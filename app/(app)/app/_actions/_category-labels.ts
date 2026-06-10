import "server-only";

import { normalizeLegacyExpenseCategory } from "@/domain/categories/default-categories";
import {
  categoryLabel,
  resolveCategories,
} from "@/domain/categories/resolve-categories";
import { transactionCategoryLabel } from "@/domain/services/transaction-category-label";
import { repos } from "@/infrastructure/container";

export type CategoryLabeler = (key: string | null) => string | null;

export async function buildCategoryLabeler(userId: string): Promise<CategoryLabeler> {
  const rows = await repos.userCategories.listForUser(userId);
  const expense = resolveCategories("expense", rows);
  const inflow = resolveCategories("inflow", rows);
  return (rawKey) => {
    if (rawKey === null) return null;
    const system = transactionCategoryLabel(rawKey);
    if (system !== rawKey) return system;
    const key = normalizeLegacyExpenseCategory(rawKey);
    const fromExpense = categoryLabel(key, expense);
    if (fromExpense !== key) return fromExpense;
    return categoryLabel(key, inflow);
  };
}

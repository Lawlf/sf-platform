"use server";

import { categoryUsage, type CategoryUsage } from "@/application/use-cases/category/category-usage.use-case";
import {
  listCategories,
  type ListCategoriesResult,
} from "@/application/use-cases/category/list-categories.use-case";
import type { CategoryDomain } from "@/domain/categories/default-categories";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export type CategoryCatalog = ListCategoriesResult & { isPro: boolean };

export async function listCategoriesQuery(): Promise<CategoryCatalog> {
  const user = await requireUser();
  const sets = await listCategories(
    { userCategories: repos.userCategories },
    { userId: user.id },
  );
  return { ...sets, isPro: user.isPro };
}

export async function categoryUsageQuery(
  domain: CategoryDomain,
  key: string,
): Promise<CategoryUsage> {
  const user = await requireUser();
  const profileId = await getActiveProfileId();
  return categoryUsage(
    { transactions: repos.transactions, debts: repos.debts },
    { userId: user.id, profileId, domain, key },
  );
}

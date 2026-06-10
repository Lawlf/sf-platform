import type { UserCategoryRepositoryPort } from "@/domain/ports/repositories/user-category.repository";
import {
  resolveCategories,
  type ResolvedCategory,
} from "@/domain/categories/resolve-categories";

export interface ListCategoriesResult {
  expense: ResolvedCategory[];
  inflow: ResolvedCategory[];
}

export async function listCategories(
  deps: { userCategories: Pick<UserCategoryRepositoryPort, "listForUser"> },
  { userId }: { userId: string },
): Promise<ListCategoriesResult> {
  const rows = await deps.userCategories.listForUser(userId);
  return {
    expense: resolveCategories("expense", rows),
    inflow: resolveCategories("inflow", rows),
  };
}

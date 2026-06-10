import {
  CATEGORY_ICON_NAMES,
  type CategoryDomain,
} from "@/domain/categories/default-categories";
import { resolveCategories } from "@/domain/categories/resolve-categories";
import type { UserCategoryEntity } from "@/domain/entities/user-category.entity";
import type { UserCategoryRepositoryPort } from "@/domain/ports/repositories/user-category.repository";

import { CategoryError } from "./category.errors";
import { requirePro, validateCategoryName } from "./category-rules";

export interface CreateCategoryInput {
  domain: CategoryDomain;
  name: string;
  icon: string;
}

export async function createCategory(
  deps: { userCategories: Pick<UserCategoryRepositoryPort, "listForUser" | "create"> },
  {
    userId,
    isPro,
    input,
  }: { userId: string; isPro: boolean; input: CreateCategoryInput },
): Promise<UserCategoryEntity> {
  requirePro(isPro);
  const rows = await deps.userCategories.listForUser(userId);
  const resolved = resolveCategories(input.domain, rows);
  const name = validateCategoryName(input.name, resolved);
  if (!CATEGORY_ICON_NAMES.includes(input.icon)) {
    throw new CategoryError("Escolha um ícone da lista.");
  }
  const id = crypto.randomUUID();
  return deps.userCategories.create({
    id,
    userId,
    domain: input.domain,
    kind: "custom",
    slug: id,
    name,
    icon: input.icon,
    archivedAt: null,
  });
}

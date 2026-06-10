import type { CategoryDomain } from "@/domain/categories/default-categories";
import { resolveCategories } from "@/domain/categories/resolve-categories";
import type { UserCategoryRepositoryPort } from "@/domain/ports/repositories/user-category.repository";

import { CategoryError } from "./category.errors";
import { requirePro, validateCategoryName } from "./category-rules";

export async function renameCategory(
  deps: { userCategories: UserCategoryRepositoryPort },
  {
    userId,
    isPro,
    domain,
    key,
    name: rawName,
  }: { userId: string; isPro: boolean; domain: CategoryDomain; key: string; name: string },
): Promise<void> {
  requirePro(isPro);
  const rows = await deps.userCategories.listForUser(userId);
  const resolved = resolveCategories(domain, rows);
  const target = resolved.find((c) => c.key === key);
  if (!target) throw new CategoryError("Categoria não encontrada.");
  const name = validateCategoryName(rawName, resolved, { ignoreKey: key });

  if (target.isDefault) {
    const existing = await deps.userCategories.findOverride(userId, domain, key);
    if (existing) {
      await deps.userCategories.update({ ...existing, name });
    } else {
      await deps.userCategories.create({
        id: crypto.randomUUID(),
        userId,
        domain,
        kind: "override",
        slug: key,
        name,
        icon: null,
        archivedAt: null,
      });
    }
    return;
  }

  const row = await deps.userCategories.findByIdForUser(key, userId);
  if (!row) throw new CategoryError("Categoria não encontrada.");
  await deps.userCategories.update({ ...row, name });
}

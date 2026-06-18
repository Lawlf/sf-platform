import {
  FALLBACK_CATEGORY_SLUG,
  type CategoryDomain,
} from "@/domain/categories/default-categories";
import { resolveCategories } from "@/domain/categories/resolve-categories";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import type { UserCategoryRepositoryPort } from "@/domain/ports/repositories/user-category.repository";

import { CategoryError } from "./category.errors";
import { requirePro } from "./category-rules";

export interface ArchiveCategoryDeps {
  userCategories: UserCategoryRepositoryPort;
  transactions: Pick<TransactionRepositoryPort, "countByCategory" | "reassignCategory">;
  debts: Pick<DebtRepositoryPort, "countByExpenseCategory" | "reassignExpenseCategory">;
}

export async function archiveCategory(
  deps: ArchiveCategoryDeps,
  {
    userId,
    profileId,
    isPro,
    domain,
    key,
    destinationKey,
  }: {
    userId: string;
    profileId: string;
    isPro: boolean;
    domain: CategoryDomain;
    key: string;
    destinationKey: string | null;
  },
): Promise<void> {
  requirePro(isPro);
  if (key === FALLBACK_CATEGORY_SLUG) {
    throw new CategoryError("Essa categoria é o destino padrão e não pode ser arquivada.");
  }
  const rows = await deps.userCategories.listForUser(userId);
  const resolved = resolveCategories(domain, rows);
  const target = resolved.find((c) => c.key === key);
  if (!target) throw new CategoryError("Categoria não encontrada.");
  if (target.archived) throw new CategoryError("Essa categoria já está arquivada.");

  const txnCount = await deps.transactions.countByCategory(userId, key);
  const debtCount =
    domain === "expense" ? await deps.debts.countByExpenseCategory(profileId, key) : 0;

  if (txnCount + debtCount > 0) {
    if (!destinationKey) throw new CategoryError("Escolha pra onde os itens vão.");
    if (destinationKey === key) {
      throw new CategoryError("Escolha uma categoria diferente da que vai ser arquivada.");
    }
    const destination = resolved.find((c) => c.key === destinationKey);
    if (!destination || destination.archived) {
      throw new CategoryError("Categoria de destino inválida.");
    }
    await deps.transactions.reassignCategory(userId, key, destinationKey);
    if (domain === "expense") {
      await deps.debts.reassignExpenseCategory(profileId, key, destinationKey);
    }
  }

  const archivedAt = new Date();
  if (target.isDefault) {
    const existing = await deps.userCategories.findOverride(userId, domain, key);
    if (existing) {
      await deps.userCategories.update({ ...existing, archivedAt });
    } else {
      await deps.userCategories.create({
        id: crypto.randomUUID(),
        userId,
        domain,
        kind: "override",
        slug: key,
        name: null,
        icon: null,
        archivedAt,
      });
    }
    return;
  }

  const row = await deps.userCategories.findByIdForUser(key, userId);
  if (!row) throw new CategoryError("Categoria não encontrada.");
  await deps.userCategories.update({ ...row, archivedAt });
}

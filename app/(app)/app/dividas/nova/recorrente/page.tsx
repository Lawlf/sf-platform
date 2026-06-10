import { listCategories } from "@/application/use-cases/category/list-categories.use-case";
import { activeCategories } from "@/domain/categories/resolve-categories";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { RecurringDebtForm } from "./_components/recurring-debt-form";

export default async function RecorrentePage() {
  const user = await requireUser();
  const sets = await listCategories(
    { userCategories: repos.userCategories },
    { userId: user.id },
  );
  const categories = activeCategories(sets.expense).map((c) => ({
    key: c.key,
    label: c.label,
  }));
  return <RecurringDebtForm defaultCurrency={user.baseCurrency} categories={categories} />;
}

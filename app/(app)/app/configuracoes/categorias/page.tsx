import type { Metadata } from "next";
import type { Route } from "next";

import { listCategories } from "@/application/use-cases/category/list-categories.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { CategoriesManager } from "./_components/categories-manager.client";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriasPage() {
  const user = await requireUser();
  const sets = await listCategories(
    { userCategories: repos.userCategories },
    { userId: user.id },
  );

  return (
    <PageShell
      title="Categorias"
      description="As fatias do seu mês. Crie, renomeie ou esconda as que não usa."
      backHref={"/app/configuracoes" as Route}
    >
      <CategoriesManager expense={sets.expense} inflow={sets.inflow} isPro={user.isPro} />
    </PageShell>
  );
}

import type { Route } from "next";
import { notFound } from "next/navigation";

import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { EntityNotesAndFiles } from "../../../_components/notes-files/entity-notes-and-files";
import { PageShell } from "../../../_components/page-shell";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IncomeAnotacoesPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const profileId = await getActiveProfileId();

  const r = await listIncomes({ incomes: repos.incomes }, { profileId });
  if (!isOk(r)) notFound();
  const income = r.value.find((i) => i.id === id);
  if (!income) notFound();

  return (
    <PageShell
      title={`Contrato e anotações · ${income.label}`}
      backHref={`/app/renda/${id}/editar` as Route}
    >
      <EntityNotesAndFiles
        entityType="income"
        entityId={income.id}
        userId={user.id}
        isPro={user.isPro}
      />
    </PageShell>
  );
}

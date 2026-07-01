import type { Route } from "next";
import { notFound } from "next/navigation";

import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { EntityNotesAndFiles } from "../../../_components/notes-files/entity-notes-and-files";
import { PageShell } from "../../../_components/page-shell";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DebtAnotacoesPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();

  const debt = await repos.debts.findById(id);
  if (!debt || debt.userId !== user.id) notFound();

  return (
    <PageShell
      title={`Contrato e anotações · ${debt.label}`}
      backHref={`/app/dividas/${id}` as Route}
    >
      {debt.notes ? (
        <p className="text-[0.8125rem] italic text-[color:var(--text-secondary)]">{debt.notes}</p>
      ) : null}

      <EntityNotesAndFiles entityType="debt" entityId={debt.id} userId={user.id} isPro={user.isPro} />
    </PageShell>
  );
}

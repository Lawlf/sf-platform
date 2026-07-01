import type { Route } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { EntityNotesAndFiles } from "../../../_components/notes-files/entity-notes-and-files";
import { PageShell } from "../../../_components/page-shell";
import { fetchGoalDetail } from "../../_actions/goal-queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GoalAnotacoesPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const detail = await fetchGoalDetail(id);
  if (!detail) notFound();

  return (
    <PageShell
      title={`Anotações · ${detail.goal.title}`}
      backHref={`/app/metas/${id}` as Route}
    >
      <EntityNotesAndFiles entityType="goal" entityId={id} userId={user.id} isPro={user.isPro} />
    </PageShell>
  );
}

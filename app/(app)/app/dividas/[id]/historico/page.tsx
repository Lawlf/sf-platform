import type { Route } from "next";
import { notFound } from "next/navigation";

import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";

import { loadHistorico } from "./_actions/historico.action";
import { HistoricoClient } from "./_components/historico-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DebtHistoricoPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();

  const debts = repos.debts;
  const debt = await debts.findById(id);
  if (!debt || debt.userId !== user.id) notFound();

  const payload = await loadHistorico(id);

  return (
    <PageShell
      title={`Histórico mensal · ${debt.label}`}
      description="Edite o valor de cada mês ou defina faixas de reajuste."
      backHref={`/app/dividas/${id}` as Route}
    >
      <HistoricoClient
        debtId={id}
        debtLabel={debt.label}
        initialAdjustments={payload.adjustments}
        initialTimeline={payload.timeline}
      />
    </PageShell>
  );
}

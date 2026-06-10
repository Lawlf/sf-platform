import type { Metadata } from "next";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";
import { SimEmptyState } from "../_components/sim-empty-state";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { PayoffForm } from "./_components/payoff-form";

export const metadata: Metadata = { title: "Projeção de quitação" };

export default async function QuitacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ debtId?: string }>;
}) {
  const user = await requireUser();
  const { debtId: requestedDebtId } = await searchParams;
  const listed = await listDebts(
    { debts: repos.debts },
    { userId: user.id, status: "active" },
  );
  const debts = isOk(listed)
    ? listed.value.map((d) => ({
        id: d.id,
        label: d.label,
        currentBalanceFormatted: d.currentBalance.format(),
      }))
    : [];
  const defaultDebtId =
    requestedDebtId && debts.some((d) => d.id === requestedDebtId) ? requestedDebtId : undefined;

  return (
    <PageShell
      title="Projeção de quitação"
      description="Quanto tempo até zerar a dívida?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="projecao-quitacao"
        summary="Escolha a dívida e o quanto paga por mês. A gente projeta o saldo mês a mês até zerar e mostra a data prevista e o total de juros."
      />
      {debts.length === 0 ? (
        <SimEmptyState
          message="Cadastre uma dívida ativa para projetar a quitação."
          ctaHref="/app/dividas/nova"
          ctaLabel="Cadastrar dívida"
        />
      ) : (
        <PayoffForm debts={debts} {...(defaultDebtId ? { defaultDebtId } : {})} />
      )}
    </PageShell>
  );
}

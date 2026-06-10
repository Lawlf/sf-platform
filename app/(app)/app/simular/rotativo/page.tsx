import type { Metadata } from "next";
import type { Route } from "next";

import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";

import { RotativoClient } from "./_components/rotativo.client";

export const metadata: Metadata = { title: "Custo do rotativo do cartão" };

interface PageProps {
  searchParams: Promise<{ debtId?: string }>;
}

export default async function RotativoPage({ searchParams }: PageProps) {
  const { debtId } = await searchParams;
  const user = await requireUser();

  let statementCents = "0";
  let monthlyRatePct: number | null = null;
  let cardDebtId: string | null = null;
  let backHref: Route = "/app/simular" as Route;

  if (debtId) {
    const r = await getDebtDetail(
      { debts: repos.debts, payments: repos.debtPayments },
      { userId: user.id, debtId },
    );
    if (isOk(r) && r.value.debt.kind === "credit_card") {
      const debt = r.value.debt;
      statementCents = debt.currentStatement.toCents().toString();
      monthlyRatePct = debt.revolvingMonthlyRate
        ? Math.round(debt.revolvingMonthlyRate.toDecimal() * 100)
        : null;
      cardDebtId = debt.id;
      backHref = `/app/dividas/${debt.id}` as Route;
    }
  }

  return (
    <PageShell
      title="Pagar só uma parte da fatura, quanto custa?"
      description="A gente mostra pra onde vai a fatura se você rolar o resto mês a mês."
      backHref={backHref}
    >
      <RotativoClient
        prefill={{ statementCents, monthlyRatePct, debtId: cardDebtId }}
      />
    </PageShell>
  );
}

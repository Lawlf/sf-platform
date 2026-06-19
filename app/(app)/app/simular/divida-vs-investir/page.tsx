import type { Metadata } from "next";

import { monthlyRateFor } from "@/domain/services/financial-health.service";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimEmptyState } from "../_components/sim-empty-state";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { DebtVsInvestClient } from "./_components/debt-vs-invest.client";

export const metadata: Metadata = { title: "Quitar dívida ou investir?" };

export default async function DividaVsInvestirPage() {
  const user = await requireUser();
  const profileId = await getActiveProfileId();
  const debts = await repos.debts.listForProfile(profileId, { status: "active" });

  // Só dívidas que cobram juros: amortizar uma sem juros (recorrente) não
  // economiza nada. Anualiza a taxa mensal para comparar com o investimento.
  const items = debts
    .map((d) => {
      const monthly = monthlyRateFor(d);
      const annualRatePct = (Math.pow(1 + monthly, 12) - 1) * 100;
      return {
        id: d.id,
        label: d.label,
        balanceFormatted: d.currentBalance.format(),
        annualRatePct: Number(annualRatePct.toFixed(2)),
      };
    })
    .filter((d) => d.annualRatePct > 0);

  return (
    <PageShell
      title="Quitar dívida ou investir?"
      description="Onde sua folga rende mais: abatendo dívida ou no CDI?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="divida-vs-investir"
        summary="A gente compara o juro que você evita quitando a dívida com o rendimento que a mesma quantia teria investida. Quem cobra/rende mais decide."
      />
      {items.length === 0 ? (
        <SimEmptyState
          message="Cadastre uma dívida com juros (financiamento, empréstimo, cartão ou cheque especial) para comparar."
          ctaHref="/app/dividas/nova"
          ctaLabel="Cadastrar dívida"
        />
      ) : (
        <DebtVsInvestClient debts={items} />
      )}
    </PageShell>
  );
}

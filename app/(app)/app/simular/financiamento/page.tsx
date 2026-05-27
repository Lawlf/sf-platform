import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { FinancingComparisonClient } from "./_components/financing-comparison.client";

export const metadata: Metadata = { title: "Financiamento: Price ou SAC?" };

export default async function FinanciamentoPage() {
  await requireUser();

  return (
    <PageShell
      title="Financiamento: Price ou SAC?"
      description="Veja a parcela e o custo total antes de assinar."
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="financiamento-price-sac"
        summary="A gente simula o mesmo financiamento nos dois sistemas lado a lado: parcela fixa (Price) ou decrescente (SAC). Compare a primeira parcela e o total de juros."
      />
      <FinancingComparisonClient />
    </PageShell>
  );
}

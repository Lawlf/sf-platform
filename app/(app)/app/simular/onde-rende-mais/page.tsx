import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { SavingsComparisonClient } from "./_components/savings-comparison.client";

export const metadata: Metadata = { title: "Onde rende mais" };

export default async function OndeRendeMaisPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Onde rende mais?"
      description="Poupança, CDB ou Tesouro Selic: qual rende mais, já líquido de imposto?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="onde-rende-mais"
        summary="A gente projeta o rendimento líquido (depois do Imposto de Renda) de cada aplicação e mostra lado a lado quem ganha."
      />
      <SavingsComparisonClient prefill={{ amountCents: prefill.cashReserveCents }} />
    </PageShell>
  );
}

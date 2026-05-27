import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { IndependenceSimulatorClient } from "./_components/independence-simulator.client";

export const metadata: Metadata = { title: "Independência financeira" };

export default async function IndependenciaPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Independência financeira"
      description="Quando seu patrimônio paga suas contas sem você trabalhar?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="independencia-financeira"
        summary="A gente parte do seu patrimônio, do quanto sobra por mês e do seu custo de vida pra projetar quando você fica livre. Ajuste os números à vontade."
      />
      <IndependenceSimulatorClient
        prefill={{
          investedCents: prefill.investedCents,
          contributionCents: prefill.contributionCents,
          costCents: prefill.incomeCents,
        }}
      />
    </PageShell>
  );
}

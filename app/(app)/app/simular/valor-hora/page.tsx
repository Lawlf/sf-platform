import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { HourlyRateClient } from "./_components/hourly-rate.client";

export const metadata: Metadata = { title: "Valor da sua hora" };

export default async function ValorHoraPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Valor da sua hora"
      description="Quanto vale uma hora do seu trabalho?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="valor-hora"
        summary="Dois caminhos: parta da sua renda mensal pra ver quanto vale a sua hora, ou informe as diárias e horas que você faz pra estimar quanto fecha no mês e salvar como renda."
      />
      <HourlyRateClient prefill={{ netMonthlyCents: prefill.incomeCents }} />
    </PageShell>
  );
}

import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { EmergencyFundClient } from "./_components/emergency-fund.client";

export const metadata: Metadata = { title: "Reserva de emergência" };

export default async function ReservaPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Reserva de emergência"
      description="Quantos meses você aguenta se a renda parar?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="reserva-emergencia"
        summary="A gente parte do seu custo fixo mensal e das suas reservas pra mostrar quantos meses você está coberto e quanto falta pra meta."
      />
      <EmergencyFundClient
        prefill={{
          monthlyCostCents: prefill.monthlyServiceCents,
          currentReserveCents: prefill.cashReserveCents,
          contributionCents: prefill.contributionCents,
        }}
      />
    </PageShell>
  );
}

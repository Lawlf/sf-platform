import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { ThirteenthClient } from "./_components/thirteenth.client";

export const metadata: Metadata = { title: "13º salário líquido" };

export default async function DecimoTerceiroPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="13º salário líquido"
      description="Quanto sobra do décimo terceiro depois dos descontos?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="decimo-terceiro"
        summary="O 13º é tributado separado do salário do mês. A gente desconta INSS e IR sobre ele e mostra quanto cai em cada uma das duas parcelas."
      />
      <ThirteenthClient prefill={{ grossSalaryCents: prefill.incomeCents }} />
    </PageShell>
  );
}

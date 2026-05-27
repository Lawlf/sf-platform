import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { InvestmentGoalClient } from "./_components/investment-goal.client";

export const metadata: Metadata = { title: "Meta de investimento" };

export default async function MetaPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Meta de investimento"
      description="Quanto aportar por mês para chegar onde você quer?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="meta-investimento"
        summary="Diga a meta, o prazo e o quanto já tem investido. A gente calcula o aporte mensal necessário pra chegar lá."
      />
      <InvestmentGoalClient prefill={{ initialCents: prefill.investedCents }} />
    </PageShell>
  );
}

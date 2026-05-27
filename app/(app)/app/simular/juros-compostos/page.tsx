import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { CompoundGrowthClient } from "./_components/compound-growth.client";

export const metadata: Metadata = { title: "Juros compostos" };

export default async function JurosCompostosPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Juros compostos"
      description="Quanto seu dinheiro vira investindo todo mês?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="juros-compostos"
        summary="A gente projeta seu patrimônio compondo mês a mês a partir do que você já tem e do quanto aporta. Veja quanto vira juro sobre juro."
      />
      <CompoundGrowthClient
        prefill={{
          initialCents: prefill.investedCents,
          contributionCents: prefill.contributionCents,
        }}
      />
    </PageShell>
  );
}

import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { CltVsPjClient } from "./_components/clt-vs-pj.client";

export const metadata: Metadata = { title: "CLT ou PJ?" };

export default async function CltVsPjPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="CLT ou PJ?"
      description="Quanto sobra como CLT e como PJ, no fim do mês?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="clt-vs-pj"
        summary="A gente calcula o líquido CLT (com opção de somar FGTS, 13º e férias) e o líquido PJ (MEI ou Simples, com imposto, pró-labore e contador) pra comparar de verdade."
      />
      <CltVsPjClient prefill={{ cltGrossCents: prefill.incomeCents }} />
    </PageShell>
  );
}

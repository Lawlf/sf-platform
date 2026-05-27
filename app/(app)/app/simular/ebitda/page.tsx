import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { EbitdaClient } from "./_components/ebitda.client";

export const metadata: Metadata = { title: "EBITDA" };

export default async function EbitdaPage() {
  await requireUser();

  return (
    <PageShell
      title="EBITDA"
      description="Quanto sua operação gera de caixa, antes de juros e impostos?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="ebitda"
        summary="A gente tira da receita os custos e as despesas da operação pra mostrar o EBITDA: o caixa que o seu negócio gera antes de juros, impostos e depreciação."
      />
      <EbitdaClient />
    </PageShell>
  );
}

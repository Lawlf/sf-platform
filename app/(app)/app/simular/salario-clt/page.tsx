import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { CltSalaryClient } from "./_components/clt-salary.client";

export const metadata: Metadata = { title: "Salário líquido CLT" };

export default async function SalarioCltPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Salário líquido CLT"
      description="Quanto cai na conta depois de INSS e Imposto de Renda?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="salario-clt"
        summary="A gente desconta INSS (progressivo, por faixa) e o Imposto de Renda do seu salário bruto e mostra cada etapa, pra você entender de onde sai cada centavo."
      />
      <CltSalaryClient prefill={{ grossCents: prefill.incomeCents }} />
    </PageShell>
  );
}

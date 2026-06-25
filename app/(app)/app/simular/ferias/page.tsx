import type { Metadata } from "next";

import { CalcReference } from "@/app/(public)/calculadora/_components/calc-reference";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { VacationClient } from "./_components/vacation.client";

export const metadata: Metadata = { title: "Férias líquidas" };

export default async function FeriasPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Férias líquidas"
      description="Quanto você recebe de férias, com o terço constitucional?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="ferias"
        summary="A gente soma o salário dos dias de férias com o terço constitucional (1/3) e desconta INSS e IR sobre o total."
      />
      <VacationClient prefill={{ grossSalaryCents: prefill.incomeCents }} />
      <CalcReference simId="ferias" />
    </PageShell>
  );
}

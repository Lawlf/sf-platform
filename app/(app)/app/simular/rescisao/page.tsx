import type { Metadata } from "next";

import { CalcReference } from "@/app/(public)/calculadora/_components/calc-reference";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { SeveranceClient } from "./_components/severance.client";

export const metadata: Metadata = { title: "Rescisão (demissão)" };

export default async function RescisaoPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Rescisão (demissão)"
      description="Quanto você recebe numa demissão sem justa causa?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="rescisao"
        summary="A gente soma as verbas (saldo, aviso, 13º e férias proporcionais), aplica os descontos certos e traz o FGTS com a multa de 40%."
      />
      <SeveranceClient prefill={{ grossSalaryCents: prefill.incomeCents }} />
      <CalcReference simId="rescisao" />
    </PageShell>
  );
}

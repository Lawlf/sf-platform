import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { RuleOfThreeClient } from "./_components/rule-of-three.client";

export const metadata: Metadata = { title: "Regra de três" };

export default async function RegraDeTresPage() {
  await requireUser();

  return (
    <PageShell
      title="Regra de três"
      description="Descubra um valor proporcional na hora."
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="regra-de-tres"
        summary="A clássica: A está para B assim como C está para X. Escolha direta ou inversa e a gente acha o valor que falta."
      />
      <RuleOfThreeClient />
    </PageShell>
  );
}

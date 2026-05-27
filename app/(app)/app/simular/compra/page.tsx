import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { PurchaseSimulatorClient } from "./_components/purchase-simulator.client";

export const metadata: Metadata = { title: "Vale a pena comprar?" };

export default async function CompraPage() {
  await requireUser();
  return (
    <PageShell
      title="Vale a pena comprar?"
      description="Compare comprar vs investir. Veja o custo real e o que sobraria em CDI."
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="compra-vs-investir"
        summary="A gente compara o mesmo dinheiro em três caminhos: comprar e manter, comprar e revender, ou investir no CDI. Veja o custo de oportunidade de cada escolha."
      />
      <PurchaseSimulatorClient />
    </PageShell>
  );
}

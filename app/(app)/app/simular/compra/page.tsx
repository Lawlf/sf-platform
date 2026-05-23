import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

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
      <PurchaseSimulatorClient />
    </PageShell>
  );
}

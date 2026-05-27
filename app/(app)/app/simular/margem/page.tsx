import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { MarginMarkupClient } from "./_components/margin-markup.client";

export const metadata: Metadata = { title: "Margem e markup" };

export default async function MargemPage() {
  await requireUser();

  return (
    <PageShell
      title="Margem e markup"
      description="Quanto você ganha em cada venda, sem confundir os dois."
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="margem-markup"
        summary="Margem é sobre o preço (vai até 100%); markup é sobre o custo (pode passar). A gente mostra os dois e ainda calcula o preço pra uma margem que você quer."
      />
      <MarginMarkupClient />
    </PageShell>
  );
}

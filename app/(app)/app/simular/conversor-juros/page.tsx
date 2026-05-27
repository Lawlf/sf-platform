import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { RateConverterClient } from "./_components/rate-converter.client";

export const metadata: Metadata = { title: "Conversor de taxa de juros" };

export default async function ConversorJurosPage() {
  await requireUser();

  return (
    <PageShell
      title="Conversor de taxa de juros"
      description="Mensal vira anual (e vice-versa) com juros compostos."
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="conversor-juros"
        summary="Informe a taxa e diga se é mensal ou anual. A gente converte com juros compostos, do jeito certo: 1% ao mês não é 12% ao ano, é 12,68%."
      />
      <RateConverterClient />
    </PageShell>
  );
}

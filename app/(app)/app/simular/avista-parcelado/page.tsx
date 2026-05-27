import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { CashVsInstallmentClient } from "./_components/cash-vs-installment.client";

export const metadata: Metadata = { title: "À vista ou parcelado?" };

export default async function AvistaParceladoPage() {
  await requireUser();

  return (
    <PageShell
      title="À vista ou parcelado?"
      description="Vale o desconto à vista ou parcelar sem juros e investir?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="avista-parcelado"
        summary="A gente compara o preço à vista (com desconto) com o valor presente das parcelas, considerando que o dinheiro renderia investido. O menor em valor de hoje vence."
      />
      <CashVsInstallmentClient />
    </PageShell>
  );
}

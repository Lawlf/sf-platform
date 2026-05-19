import { PageShell } from "../../../_components/page-shell";

import { FinancingForm } from "./_components/financing-form";

export default function FinanciamentoPage() {
  return (
    <PageShell title="Novo financiamento" description="Imóvel ou veículo com sistema Price ou SAC.">
      <FinancingForm />
    </PageShell>
  );
}

import type { Metadata } from "next";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";
import { SimEmptyState } from "../_components/sim-empty-state";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { ExtraForm } from "./_components/extra-form";

export const metadata: Metadata = { title: "Pagar extra" };

export default async function ExtraPage() {
  const user = await requireUser();
  const listed = await listDebts(
    { debts: repos.debts },
    { userId: user.id, status: "active" },
  );
  const debts = isOk(listed)
    ? listed.value.map((d) => ({
        id: d.id,
        label: d.label,
        currentBalanceFormatted: d.currentBalance.format(),
      }))
    : [];

  return (
    <PageShell
      title="Pagar extra"
      description="Compare quitação com e sem pagamento extra."
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="pagar-extra"
        summary="A gente roda a quitação duas vezes, com e sem um valor extra todo mês, e mostra quantos meses e quanto de juros você corta."
      />
      {debts.length === 0 ? (
        <SimEmptyState
          message="Cadastre uma dívida ativa para comparar com e sem pagamento extra."
          ctaHref="/app/dividas/nova"
          ctaLabel="Cadastrar dívida"
        />
      ) : (
        <ExtraForm debts={debts} />
      )}
    </PageShell>
  );
}

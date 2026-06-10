import type { Metadata } from "next";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";
import { SimEmptyState } from "../_components/sim-empty-state";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { StrategyForm } from "./_components/strategy-form";

export const metadata: Metadata = { title: "Qual dívida pagar primeiro" };

export default async function EstrategiaPage() {
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
      title="Qual dívida pagar primeiro"
      description="Menor saldo ou juro mais alto: qual ordem economiza mais?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="snowball-avalanche"
        summary="Com várias dívidas e um orçamento fixo, a ordem que você paga muda o total de juros. A gente compara as duas formas com o mesmo orçamento."
      />
      {debts.length === 0 ? (
        <SimEmptyState
          message="Cadastre ao menos uma dívida ativa para comparar as estratégias."
          ctaHref="/app/dividas/nova"
          ctaLabel="Cadastrar dívida"
        />
      ) : (
        <StrategyForm debts={debts} />
      )}
    </PageShell>
  );
}

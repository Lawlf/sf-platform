import type { Metadata } from "next";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";
import { SimEmptyState } from "../_components/sim-empty-state";
import { SimHowItWorks } from "../_components/sim-how-it-works";

import { StrategyForm } from "./_components/strategy-form";

export const metadata: Metadata = { title: "Snowball vs Avalanche" };

export default async function EstrategiaPage() {
  const user = await requireUser();
  const listed = await listDebts(
    { debts: new DrizzleDebtRepository() },
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
      title="Snowball vs Avalanche"
      description="Qual ordem rende mais com seu orçamento?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="snowball-avalanche"
        summary="Com várias dívidas e um orçamento fixo, a ordem que você ataca muda o total de juros. A gente compara as duas estratégias com o mesmo orçamento."
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

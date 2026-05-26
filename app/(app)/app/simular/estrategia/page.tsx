import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";

import { StrategyForm } from "./_components/strategy-form";

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
    <PageShell title="Snowball vs Avalanche" description="Qual ordem rende mais com seu orçamento?">
      {debts.length === 0 ? (
        <p className="text-sm opacity-70">Cadastre ao menos uma dívida ativa para comparar.</p>
      ) : (
        <StrategyForm debts={debts} />
      )}
    </PageShell>
  );
}

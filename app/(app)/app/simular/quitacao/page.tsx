import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

import { PageShell } from "../../_components/page-shell";

import { PayoffForm } from "./_components/payoff-form";

export default async function QuitacaoPage() {
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
    <PageShell title="Projeção de quitação" description="Quanto tempo até zerar a dívida?">
      {debts.length === 0 ? (
        <p className="text-sm opacity-70">Cadastre uma dívida ativa para simular.</p>
      ) : (
        <PayoffForm debts={debts} />
      )}
    </PageShell>
  );
}

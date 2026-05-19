import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isOk } from "@/shared/errors";

import { PageShell } from "../../_components/page-shell";

import { StrategyForm } from "./_components/strategy-form";

export default async function EstrategiaPage() {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
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

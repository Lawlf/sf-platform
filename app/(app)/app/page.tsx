import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { getUpcomingDueDates } from "@/application/use-cases/dashboard/get-upcoming-due-dates.use-case";
import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isOk } from "@/shared/errors";

import { DashboardCards } from "./_components/dashboard-cards";
import { PageShell } from "./_components/page-shell";
import { TimelinePlaceholder } from "./_components/timeline-placeholder";
import { UpcomingDues } from "./_components/upcoming-dues";

export default async function DashboardPage() {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const debtRepo = new DrizzleDebtRepository();
  const clock = new SystemClock();

  const snapshotR = await getDashboardSnapshot(
    { debts: debtRepo, incomes: new DrizzleIncomeRepository(), clock },
    { userId: user.id },
  );
  const upcomingR = await getUpcomingDueDates(
    { debts: debtRepo, clock },
    { userId: user.id, horizonDays: 30 },
  );

  const snapshot = isOk(snapshotR) ? snapshotR.value : null;
  const upcoming = isOk(upcomingR) ? upcomingR.value : [];

  return (
    <PageShell
      title={`Olá, ${user.displayName ?? "bem-vindo"}`}
      description={greetingFor(snapshot)}
    >
      {snapshot ? (
        <DashboardCards snapshot={snapshot} />
      ) : (
        <p className="text-sm opacity-70">Cadastre renda e dívidas para ver seu painel.</p>
      )}

      <section className="glass-light p-4">
        <h2 className="mb-2 text-sm font-semibold opacity-80">Linha do tempo</h2>
        <TimelinePlaceholder />
      </section>

      <section className="glass-light p-4">
        <h2 className="mb-2 text-sm font-semibold opacity-80">Próximos vencimentos (30 dias)</h2>
        <UpcomingDues
          items={upcoming.map((d) => ({
            debtId: d.debtId,
            label: d.label,
            dueDate: d.dueDate.toISOString(),
            amountFormatted: d.amount?.format() ?? null,
          }))}
        />
      </section>

      <Button asChild>
        <Link href={"/app/simular" as Route}>Simular cenário</Link>
      </Button>
    </PageShell>
  );
}

function greetingFor(snapshot: FinancialSnapshotEntity | null): string {
  if (!snapshot) return "Comece cadastrando suas fontes de renda e dívidas.";
  if (snapshot.incomeCommittedPct > 1)
    return "Atenção: seu comprometimento de renda passou de 100%.";
  if (snapshot.incomeCommittedPct > 0.4)
    return "Atenção: comprometimento alto, considere simular cenários.";
  if (snapshot.totalDebtBalance.isZero()) return "Você está sem dívidas. Bom trabalho.";
  return "Você está no caminho. Continue acompanhando seu progresso.";
}

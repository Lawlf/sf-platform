import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isOk } from "@/shared/errors";

import { PageShell } from "../_components/page-shell";

import { ArchiveIncomeButton } from "./_components/archive-income-button";
import { IncomeForm } from "./_components/income-form";

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  one_off: "Pontual",
};

export default async function RendaPage() {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
  const listed = await listIncomes({ incomes: new DrizzleIncomeRepository() }, { userId: user.id });
  const incomes = isOk(listed) ? listed.value : [];

  const active = incomes.filter((i) => i.isActive);
  const archived = incomes.filter((i) => !i.isActive);

  return (
    <PageShell title="Renda" description="Cadastre suas fontes de renda mensais e extras.">
      <section className="glass-light p-4">
        <h2 className="mb-2 text-sm font-semibold opacity-80">Adicionar renda</h2>
        <IncomeForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold opacity-80">Ativas</h2>
        {active.length === 0 ? (
          <p className="text-sm opacity-70">Nenhuma renda ativa.</p>
        ) : (
          active.map((income) => (
            <article key={income.id} className="glass-light flex items-center justify-between p-4">
              <div className="text-sm">
                <p className="font-medium">{income.label}</p>
                <p className="opacity-70">
                  {income.amount.format()} -{" "}
                  {FREQUENCY_LABELS[income.frequency] ?? income.frequency}
                </p>
              </div>
              <ArchiveIncomeButton incomeId={income.id} />
            </article>
          ))
        )}
      </section>

      {archived.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold opacity-80">Arquivadas</h2>
          {archived.map((income) => (
            <article
              key={income.id}
              className="glass-light flex items-center justify-between p-4 opacity-60"
            >
              <div className="text-sm">
                <p className="font-medium">{income.label}</p>
                <p className="opacity-70">
                  {income.amount.format()} -{" "}
                  {FREQUENCY_LABELS[income.frequency] ?? income.frequency}
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </PageShell>
  );
}

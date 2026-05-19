import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/app/components/ui/button";
import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

import { PageShell } from "../../_components/page-shell";

import { ArchiveDebtButton } from "./_components/archive-debt-button";
import { ScheduleRender } from "./_components/schedule-render";

const KIND_LABEL: Record<string, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo pessoal",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  paid_off: "Quitada",
  written_off: "Baixada",
};

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DebtDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const r = await getDebtDetail(
    { debts: new DrizzleDebtRepository(), payments: new DrizzleDebtPaymentRepository() },
    { userId: user.id, debtId: id },
  );
  if (isErr(r)) {
    notFound();
  }
  const { debt, amortization, payments } = r.value;

  return (
    <PageShell title={debt.label}>
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/60 px-2 py-1 text-xs">
            {KIND_LABEL[debt.kind]}
          </span>
          <span className="rounded-full bg-white/60 px-2 py-1 text-xs">
            {STATUS_LABEL[debt.status]}
          </span>
        </div>
        <p className="text-sm opacity-80">
          Saldo atual: <strong>{debt.currentBalance.format()}</strong>
        </p>
        <p className="text-sm opacity-80">
          Início: {DATE_FMT.format(debt.startDate)}
          {debt.expectedEndDate ? ` - Previsto: ${DATE_FMT.format(debt.expectedEndDate)}` : null}
        </p>
        {debt.notes ? <p className="text-sm italic opacity-70">{debt.notes}</p> : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {debt.status === "active" ? (
          <>
            <Button asChild>
              <Link href={`/app/dividas/${debt.id}/pagar` as Route}>Registrar pagamento</Link>
            </Button>
            <ArchiveDebtButton debtId={debt.id} />
          </>
        ) : null}
      </div>

      {amortization ? (
        <section className="glass-light p-4">
          <h2 className="mb-2 text-sm font-semibold opacity-80">Cronograma de amortização</h2>
          <ScheduleRender
            installments={amortization.installments.map((row) => ({
              month: row.month,
              installment: row.installment.format(),
              principal: row.principal.format(),
              interest: row.interest.format(),
              remainingBalance: row.remainingBalance.format(),
            }))}
          />
        </section>
      ) : (
        <section className="glass-light p-4">
          <p className="text-sm opacity-80">
            {debt.kind === "credit_card"
              ? "Cartão não possui cronograma fixo; veja os pagamentos abaixo."
              : "Sem cronograma de amortização para este tipo."}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold opacity-80">Pagamentos registrados</h2>
        {payments.length === 0 ? (
          <p className="text-sm opacity-70">Nenhum pagamento registrado.</p>
        ) : (
          payments.map((p) => (
            <article
              key={p.id}
              className="glass-light flex items-center justify-between gap-3 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{DATE_FMT.format(p.paidAt)}</p>
                <p className="opacity-70">
                  {p.amount.format()} ({p.principalPortion.format()} principal +{" "}
                  {p.interestPortion.format()} juros)
                </p>
              </div>
              {p.isExtra ? (
                <span className="rounded-full bg-[color:var(--color-brand-500)] px-2 py-1 text-xs text-white">
                  Extra
                </span>
              ) : null}
            </article>
          ))
        )}
      </section>
    </PageShell>
  );
}

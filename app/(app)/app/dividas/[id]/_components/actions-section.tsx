import type { Route } from "next";
import Link from "next/link";

import type { SerializedGoalWithProgress } from "@/app/(app)/app/metas/_actions/goal-queries";
import { buildGoalSeedQuery } from "@/app/(app)/app/simular/_lib/goal-seed";
import { Button } from "@/app/components/ui/button";
import type { DebtEntity } from "@/domain/entities/debt.entity";

import { ArchiveDebtButton } from "./archive-debt-button";
import { DeleteDebtButton } from "./delete-debt-button";
import { OutOfMonthButton } from "./out-of-month-button";
import { ReactivateDebtButton } from "./reactivate-debt-button";

const navLinkClass =
  "text-[0.8125rem] text-[color:var(--text-secondary)] underline-offset-2 transition-colors hover:text-[color:var(--color-brand-700)] hover:underline";

interface Props {
  debt: DebtEntity;
  linkedGoals?: SerializedGoalWithProgress[];
}

export function ActionsSection({ debt, linkedGoals = [] }: Props) {
  const payoffGoal = linkedGoals.find(
    (g) => g.goal.type === "debt_payoff" && g.goal.status === "active",
  );
  const hasPayoffGoal = payoffGoal !== undefined;
  const isActive = debt.status === "active";
  const isRecurring = debt.kind === "recurring";
  const isPayrollLoan = debt.kind === "personal_loan" && debt.payrollDeducted;
  const payLabel = debt.kind === "credit_card" ? "Paguei a fatura" : "Paguei a parcela";

  if (!isActive) {
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Ações</h2>
        <div className="mt-3 flex flex-col gap-4">
          <ReactivateDebtButton
            debtId={debt.id}
            label={debt.label}
            actionLabel={debt.status === "written_off" ? "Voltar pro meu mês" : "Reativar dívida"}
          />
          <ManageRow debt={debt} />
        </div>
        {debt.notes ? (
          <p className="mt-3 text-[0.75rem] italic text-[color:var(--text-muted)]">{debt.notes}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Ações</h2>

      <div className="mt-3 flex flex-col gap-5">
        {!isRecurring && !isPayrollLoan ? (
          <Button asChild className="w-full">
            <Link href={`/app/dividas/${debt.id}/pagar` as Route}>{payLabel}</Link>
          </Button>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Decisões do mês
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ArchiveDebtButton debtId={debt.id} label={debt.label} recurring={isRecurring} />
            {!isRecurring ? <OutOfMonthButton debtId={debt.id} /> : null}
          </div>
          <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
            {isRecurring
              ? "Encerrar para de contar no seu mês e libera esse valor. A dívida some da lista, mas dá pra reativar."
              : "Terminei de pagar fecha a conta. Tirar do meu mês mantém ela na sua dívida total, só não conta no mês."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--border-soft)] pt-4">
          <Link href={`/app/dividas/${debt.id}/historico` as Route} className={navLinkClass}>
            Histórico mensal
          </Link>
          {!isRecurring ? (
            <Link href={`/app/simular/quitacao?debtId=${debt.id}` as Route} className={navLinkClass}>
              Ver se vale adiantar
            </Link>
          ) : null}
          {isRecurring ? (
            <Link href={"/app/metas/nova" as Route} className={navLinkClass}>
              Guardar esse valor
            </Link>
          ) : hasPayoffGoal ? (
            <Link href={`/app/metas/${payoffGoal.goal.id}` as Route} className={navLinkClass}>
              Ver meta de quitação
            </Link>
          ) : (
            <Link
              href={`/app/metas/nova?${buildGoalSeedQuery({ type: "debt_payoff", debtId: debt.id })}` as Route}
              className={navLinkClass}
            >
              Criar meta de quitação
            </Link>
          )}
        </div>

        <ManageRow debt={debt} />
      </div>

      {debt.notes ? (
        <p className="mt-3 text-[0.75rem] italic text-[color:var(--text-muted)]">{debt.notes}</p>
      ) : null}
    </section>
  );
}

function ManageRow({ debt }: { debt: DebtEntity }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[color:var(--border-soft)] pt-4">
      <Button asChild variant="ghost" size="sm" className="text-[color:var(--text-secondary)]">
        <Link href={`/app/dividas/${debt.id}/editar` as Route}>Editar</Link>
      </Button>
      <DeleteDebtButton debtId={debt.id} label={debt.label} />
    </div>
  );
}

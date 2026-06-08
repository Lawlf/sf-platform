import type { Route } from "next";
import Link from "next/link";

import type { SerializedGoalWithProgress } from "@/app/(app)/app/metas/_actions/goal-queries";
import { buildGoalSeedQuery } from "@/app/(app)/app/simular/_lib/goal-seed";
import { Button } from "@/app/components/ui/button";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";
import type { AlarmOffset } from "@/infrastructure/calendar/ics-builder";

import { ArchiveDebtButton } from "./archive-debt-button";
import { CalendarActions } from "./calendar-actions";
import { DeleteDebtButton } from "./delete-debt-button";
import { OutOfMonthButton } from "./out-of-month-button";
import { ReactivateDebtButton } from "./reactivate-debt-button";

const FREQ_WORD = { monthly: "mês", weekly: "semana", annual: "ano" } as const;

interface Props {
  debt: DebtEntity;
  hasCalendarSchedule?: boolean;
  googleCalendarUrl?: string | null;
  defaultAlarm?: AlarmOffset;
  linkedGoals?: SerializedGoalWithProgress[];
}

export function ActionsSection({
  debt,
  hasCalendarSchedule = false,
  googleCalendarUrl = null,
  defaultAlarm = "1d",
  linkedGoals = [],
}: Props) {
  const payoffGoal = linkedGoals.find(
    (g) => g.goal.type === "debt_payoff" && g.goal.status === "active",
  );
  const hasPayoffGoal = payoffGoal !== undefined;
  const isActive = debt.status === "active";
  const isRecurring = debt.kind === "recurring";
  const recurringValueLabel = isRecurring
    ? `${Money.fromCents(debt.recurringAmountCents).format()}/${FREQ_WORD[debt.recurringFrequency]}`
    : undefined;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Ações</h2>

      {isActive ? (
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {debt.kind !== "recurring" ? (
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href={`/app/dividas/${debt.id}/pagar` as Route}>Registrar pagamento</Link>
              </Button>
            ) : null}
            <ArchiveDebtButton
              debtId={debt.id}
              label={debt.label}
              recurring={isRecurring}
              valueLabel={recurringValueLabel}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/dividas/${debt.id}/editar` as Route}>Editar</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/dividas/${debt.id}/historico` as Route}>Histórico mensal</Link>
            </Button>
            {isRecurring ? (
              <Button asChild size="sm" variant="outline">
                <Link href={"/app/metas/nova" as Route}>Guardar esse valor</Link>
              </Button>
            ) : hasPayoffGoal ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/metas/${payoffGoal.goal.id}` as Route}>Ver meta de quitação</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/app/metas/nova?${buildGoalSeedQuery({ type: "debt_payoff", debtId: debt.id })}` as Route}
                >
                  Criar meta de quitação
                </Link>
              </Button>
            )}
          </div>

          {hasCalendarSchedule ? (
            <div className="border-t border-[color:var(--border-soft)] pt-3">
              <CalendarActions
                debtId={debt.id}
                googleCalendarUrl={googleCalendarUrl}
                defaultAlarm={defaultAlarm}
              />
            </div>
          ) : null}

          {!isRecurring ? (
            <div className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] pt-3">
              <OutOfMonthButton debtId={debt.id} />
              <p className="text-[0.75rem] text-[color:var(--text-muted)]">
                Some do seu comprometido. Continua no total que você deve.
              </p>
            </div>
          ) : null}

          <div className="border-t border-[color:var(--border-soft)] pt-3">
            <DeleteDebtButton debtId={debt.id} label={debt.label} />
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          <ReactivateDebtButton
            debtId={debt.id}
            label={debt.label}
            actionLabel={debt.status === "written_off" ? "Voltar pro meu mês" : "Reativar dívida"}
          />
          <div className="border-t border-[color:var(--border-soft)] pt-3">
            <DeleteDebtButton debtId={debt.id} label={debt.label} />
          </div>
        </div>
      )}

      {debt.notes ? (
        <p className="mt-3 text-[0.75rem] italic text-[color:var(--text-muted)]">{debt.notes}</p>
      ) : null}
    </section>
  );
}

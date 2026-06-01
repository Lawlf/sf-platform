import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { buildGoalSeedQuery } from "@/app/(app)/app/simular/_lib/goal-seed";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { AlarmOffset } from "@/infrastructure/calendar/ics-builder";

import { ArchiveDebtButton } from "./archive-debt-button";
import { CalendarActions } from "./calendar-actions";
import { DeleteDebtButton } from "./delete-debt-button";
import { ReactivateDebtButton } from "./reactivate-debt-button";

interface Props {
  debt: DebtEntity;
  hasCalendarSchedule?: boolean;
  googleCalendarUrl?: string | null;
  defaultAlarm?: AlarmOffset;
}

export function ActionsSection({
  debt,
  hasCalendarSchedule = false,
  googleCalendarUrl = null,
  defaultAlarm = "1d",
}: Props) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Ações</h2>
        <div className="flex items-center gap-2">
          {debt.status === "active" ? (
            <>
              {debt.kind !== "recurring" ? (
                <Button asChild size="sm">
                  <Link href={`/app/dividas/${debt.id}/pagar` as Route}>Registrar pagamento</Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/dividas/${debt.id}/editar` as Route}>Editar</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/dividas/${debt.id}/historico` as Route}>Histórico mensal</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/app/metas/nova?${buildGoalSeedQuery({ type: "debt_payoff", debtId: debt.id })}` as Route}
                >
                  Criar meta de quitação
                </Link>
              </Button>
              <ArchiveDebtButton debtId={debt.id} label={debt.label} />
              <DeleteDebtButton debtId={debt.id} label={debt.label} />
            </>
          ) : (
            <>
              <ReactivateDebtButton debtId={debt.id} label={debt.label} />
              <DeleteDebtButton debtId={debt.id} label={debt.label} />
            </>
          )}
        </div>
      </div>
      {hasCalendarSchedule ? (
        <div className="mt-4 border-t border-[color:var(--border-soft)] pt-3">
          <CalendarActions
            debtId={debt.id}
            googleCalendarUrl={googleCalendarUrl}
            defaultAlarm={defaultAlarm}
          />
        </div>
      ) : null}
      {debt.notes ? (
        <p className="mt-3 text-[0.75rem] italic text-[color:var(--text-muted)]">{debt.notes}</p>
      ) : null}
    </section>
  );
}

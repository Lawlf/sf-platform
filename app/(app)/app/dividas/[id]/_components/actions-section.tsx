import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import type { DebtEntity } from "@/domain/entities/debt.entity";

import { ArchiveDebtButton } from "./archive-debt-button";
import { DeleteDebtButton } from "./delete-debt-button";
import { DownloadCalendarButton } from "./download-calendar-button";
import { ReactivateDebtButton } from "./reactivate-debt-button";

interface Props {
  debt: DebtEntity;
  hasCalendarSchedule?: boolean;
}

export function ActionsSection({ debt, hasCalendarSchedule = false }: Props) {
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
          <DownloadCalendarButton debtId={debt.id} />
        </div>
      ) : null}
      {debt.notes ? (
        <p className="mt-3 text-[12px] italic text-[color:var(--text-muted)]">{debt.notes}</p>
      ) : null}
    </section>
  );
}

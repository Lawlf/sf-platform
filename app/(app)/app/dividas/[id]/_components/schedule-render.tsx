"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/button";

export interface ScheduleRow {
  month: number;
  installment: string;
  principal: string;
  interest: string;
  remainingBalance: string;
}

export interface ScheduleTotals {
  totalInstallment: string;
  totalPrincipal: string;
  totalInterest: string;
}

interface ScheduleRenderProps {
  installments: ScheduleRow[];
  totals?: ScheduleTotals;
  currentMonth?: number | null;
}

export function ScheduleRender({ installments, totals, currentMonth }: ScheduleRenderProps) {
  const [expanded, setExpanded] = useState(false);
  const total = installments.length;
  const collapsed = !expanded && total > 24;
  const visible = collapsed
    ? [...installments.slice(0, 12), ...installments.slice(-6)]
    : installments;

  const ellipsisAfterIndex = collapsed ? 11 : -1;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] overflow-hidden">
        <div className="grid grid-cols-[44px_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
          <span>Mês</span>
          <span className="text-right">Parcela</span>
          <span className="text-right">Principal</span>
          <span className="text-right">Juros</span>
          <span className="text-right">Saldo</span>
        </div>

        <div className="divide-y divide-[color:var(--border-soft)]">
          {visible.map((row, idx) => {
            const isCurrent = currentMonth != null && row.month === currentMonth;
            const isPast = currentMonth != null && row.month < currentMonth;
            const rowClass = [
              "grid grid-cols-[44px_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 text-[13px] tabular-nums",
              isCurrent
                ? "bg-[color:var(--color-brand-500)]/[0.10] font-semibold text-[color:var(--text-primary)]"
                : isPast
                  ? "text-[color:var(--text-muted)]"
                  : "text-[color:var(--text-primary)]",
            ].join(" ");

            return (
              <div key={row.month}>
                {ellipsisAfterIndex === idx ? (
                  <div className="border-y border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-center text-[11px] font-medium text-[color:var(--text-muted)]">
                    ... {total - 18} parcelas ocultas ...
                  </div>
                ) : null}
                <div className={rowClass}>
                  <span className="font-semibold">{row.month}</span>
                  <span className="text-right">{row.installment}</span>
                  <span className="text-right">{row.principal}</span>
                  <span className="text-right">{row.interest}</span>
                  <span className="text-right">{row.remainingBalance}</span>
                </div>
              </div>
            );
          })}
        </div>

        {totals ? (
          <div className="grid grid-cols-[44px_1fr_1fr_1fr_1fr] gap-2 border-t-2 border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-3 py-2.5 text-[12px] font-bold tabular-nums text-[color:var(--text-primary)]">
            <span className="uppercase tracking-wide">Total</span>
            <span className="text-right">{totals.totalInstallment}</span>
            <span className="text-right">{totals.totalPrincipal}</span>
            <span className="text-right">{totals.totalInterest}</span>
            <span />
          </div>
        ) : null}
      </div>

      {total > 24 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="self-center"
        >
          {expanded ? "Mostrar menos" : `Ver todas as ${total} parcelas`}
        </Button>
      ) : null}
    </div>
  );
}

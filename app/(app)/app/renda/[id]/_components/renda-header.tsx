import type { ReactNode } from "react";

import type { IncomeFrequency } from "@/domain/entities/income.entity";
import { dateOnlyFormat } from "@/shared/format/date-only";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";

const FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  one_off: "Pontual",
};

const DATE_FMT = dateOnlyFormat({ dateStyle: "short" });

interface Props {
  label: string;
  frequency: IncomeFrequency;
  isActive: boolean;
  isEstimated: boolean;
  startDate: Date;
  endDate: Date | null;
  totalReceivedFormatted: string;
  progressPct: number | null;
  action?: ReactNode;
}

export function RendaHeader({
  label,
  frequency,
  isActive,
  isEstimated,
  startDate,
  endDate,
  totalReceivedFormatted,
  progressPct,
  action,
}: Props) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {FREQUENCY_LABEL[frequency]}
            {isEstimated ? " · estimada" : ""}
          </div>
          <h1
            className="mt-1 text-[1.5rem] font-extrabold leading-tight text-[color:var(--text-primary)]"
            style={{ letterSpacing: "-0.4px" }}
          >
            {label}
          </h1>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${
              isActive
                ? "bg-[color:var(--semantic-positive)]/15 text-[color:var(--semantic-positive)]"
                : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
            }`}
          >
            {isActive ? "Ativa" : "Arquivada"}
          </span>
        </div>
        {action}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Desde quando
          </div>
          <div className="mt-0.5 font-bold tabular-nums text-[color:var(--text-primary)]">
            {DATE_FMT.format(startDate)}
          </div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {endDate ? "Até quando" : "Quanto já recebeu"}
          </div>
          <div className="mt-0.5 font-bold tabular-nums text-[color:var(--text-primary)]">
            {endDate ? (
              DATE_FMT.format(endDate)
            ) : (
              <HideableValue>{totalReceivedFormatted}</HideableValue>
            )}
          </div>
        </div>
      </div>

      {progressPct !== null ? (
        <div className="mt-3 border-t border-[color:var(--border-soft)] pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
            <div
              className="h-full rounded-full bg-[color:var(--color-brand-500)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1.5 text-[0.75rem] font-semibold tabular-nums text-[color:var(--text-secondary)]">
            <HideableValue>{totalReceivedFormatted}</HideableValue> recebido até agora ·{" "}
            {progressPct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do período
          </div>
        </div>
      ) : null}
    </section>
  );
}

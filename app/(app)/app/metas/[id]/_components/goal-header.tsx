import type { ReactNode } from "react";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";
import type { SerializedGoal, SerializedGoalProgress } from "../../_actions/goal-queries";

const TYPE_LABEL: Record<string, string> = {
  debt_payoff: "Quitação de dívida",
  emergency_fund: "Reserva de emergência",
  savings: "Juntar um valor",
  financial_independence: "Independência financeira",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  reached: "Concluída",
  archived: "Arquivada",
};

function statusBadgeClass(status: string): string {
  if (status === "active")
    return "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]";
  if (status === "reached")
    return "bg-[color:var(--semantic-positive)]/15 text-[color:var(--semantic-positive)]";
  return "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]";
}

function brl(cents: string): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface GoalHeaderProps {
  goal: SerializedGoal;
  progress: SerializedGoalProgress;
  action?: ReactNode;
}

export function GoalHeader({ goal, progress, action }: GoalHeaderProps) {
  const targetCents = Number(progress.targetCents);
  const currentCents = Number(progress.currentCents);
  const noTarget = targetCents <= 0;
  const remainingCents = Math.max(0, targetCents - currentCents);
  const pct = Math.min(100, Math.max(0, progress.pct));

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {TYPE_LABEL[goal.type] ?? goal.type}
          </div>
          <h1
            className="mt-1 text-[1.5rem] font-extrabold leading-tight text-[color:var(--text-primary)]"
            style={{ letterSpacing: "-0.4px" }}
          >
            {goal.title}
          </h1>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${statusBadgeClass(goal.status)}`}
          >
            {STATUS_LABEL[goal.status] ?? goal.status}
          </span>
        </div>
        {action}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Alvo
          </div>
          <div className="mt-0.5 font-bold tabular-nums text-[color:var(--text-primary)]">
            {noTarget ? (
              "Sem alvo definido"
            ) : (
              <HideableValue>{brl(progress.targetCents)}</HideableValue>
            )}
          </div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Já guardou/pagou
          </div>
          <div className="mt-0.5 font-bold tabular-nums text-[color:var(--text-primary)]">
            <HideableValue>{brl(progress.currentCents)}</HideableValue>
          </div>
        </div>
      </div>

      {noTarget ? null : (
        <div className="mt-3 border-t border-[color:var(--border-soft)] pt-3">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-3)]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full ${progress.reached ? "bg-[color:var(--semantic-positive)]" : "bg-[color:var(--color-brand-500)]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-[0.75rem] font-semibold tabular-nums text-[color:var(--text-secondary)]">
            {progress.reached ? (
              "Meta atingida"
            ) : (
              <>
                Faltam <HideableValue>{brl(String(remainingCents))}</HideableValue> ·{" "}
                {pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% concluído
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

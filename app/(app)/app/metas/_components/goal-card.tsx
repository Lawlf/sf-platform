import { Landmark, Lock, Rocket, ShieldCheck, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import type { SerializedGoalWithProgress } from "../_actions/goal-queries";


function brl(cents: string): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatEtaDate(etaMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + etaMonths);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

const TYPE_ICON = {
  debt_payoff: Landmark,
  emergency_fund: ShieldCheck,
  savings: Target,
  financial_independence: Rocket,
} as const;

const TYPE_LABEL: Record<string, string> = {
  debt_payoff: "Quitação de dívida",
  emergency_fund: "Reserva de emergência",
  savings: "Juntar um valor",
  financial_independence: "Independência financeira",
};

interface GoalCardProps {
  data: SerializedGoalWithProgress;
}

export function GoalCard({ data }: GoalCardProps) {
  const { goal, progress, etaLocked } = data;

  const Icon = TYPE_ICON[goal.type as keyof typeof TYPE_ICON] ?? Target;
  const typeLabel = TYPE_LABEL[goal.type] ?? goal.type;

  const targetCents = progress.targetCents;
  const currentCents = progress.currentCents;
  const remainingCents = Math.max(0, Number(targetCents) - Number(currentCents));
  const pct = Math.min(100, Math.max(0, progress.pct));
  const noTarget = Number(targetCents) <= 0;

  const isReached = progress.reached;

  const barColor = isReached
    ? "bg-[color:var(--semantic-positive)]"
    : "bg-[color:var(--color-brand-500)]";

  return (
    <Link
      href={`/app/metas/${goal.id}` as Route}
      className="focus-ring flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {goal.title}
            </span>
            {noTarget ? null : (
              <span className="shrink-0 text-[0.875rem] font-bold tabular-nums text-[color:var(--text-primary)]">
                {pct.toFixed(0)}%
              </span>
            )}
          </div>
          <span className="block mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
            {typeLabel}
          </span>
        </div>
      </div>

      {noTarget ? null : (
        <div className="h-[9px] w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]">
          <div
            className={`h-full rounded-full transition-[width] ${barColor}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
        <span className="text-[color:var(--text-secondary)]">
          {noTarget ? (
            <span className="font-semibold text-[color:var(--color-brand-800)]">
              Defina o valor da meta
            </span>
          ) : isReached ? (
            <span className="font-semibold text-[color:var(--semantic-positive)]">Concluída</span>
          ) : (
            <>
              Faltam{" "}
              <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
                <HideableValue>{brl(String(remainingCents))}</HideableValue>
              </span>
            </>
          )}
        </span>
        {etaLocked ? (
          <span className="flex items-center gap-1 text-[color:var(--text-muted)]">
            <Lock size={12} strokeWidth={2.25} aria-hidden />
            Projeção no Pro
          </span>
        ) : progress.etaMonths !== null ? (
          <span className="text-[color:var(--text-secondary)]">
            Previsão{" "}
            <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
              {formatEtaDate(progress.etaMonths)}
            </span>
          </span>
        ) : (
          <span className="text-[color:var(--text-muted)]">Sem previsão ainda</span>
        )}
      </div>
    </Link>
  );
}

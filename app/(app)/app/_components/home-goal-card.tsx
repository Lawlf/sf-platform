import { Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { fetchGoalsWithProgress } from "../metas/_actions/goal-queries";

import { HideableValue } from "./money-visibility/hideable-value.client";

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

export async function HomeGoalCard() {
  const goals = await fetchGoalsWithProgress();
  const primary = goals.find((g) => g.goal.status === "active");

  if (!primary) {
    return null;
  }

  const { goal, progress, etaLocked } = primary;
  const pct = Math.min(100, Math.max(0, progress.pct));
  const targetCents = Number(progress.targetCents);
  const remainingCents = Math.max(0, targetCents - Number(progress.currentCents));

  return (
    <Link
      href={`/app/metas/${goal.id}` as Route}
      aria-label={`Meta: ${goal.title}`}
      className="focus-ring flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[18px] pb-[16px] pt-[14px] backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]"
      style={{ boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
          Sua meta
        </h2>
        <span className="text-[0.6875rem] font-semibold tabular-nums text-[color:var(--text-muted)]">
          {pct.toFixed(0)}%
        </span>
      </div>

      <p className="text-[0.9375rem] font-bold leading-[1.3] tracking-[-0.01em] text-[color:var(--text-primary)]">
        {goal.title}
      </p>

      <div className="h-[7px] w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]">
        <div
          className="h-full rounded-full bg-[color:var(--color-brand-500)] transition-[width]"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
        <span className="text-[color:var(--text-secondary)]">
          {targetCents <= 0 ? (
            <span className="font-semibold text-[color:var(--color-brand-700)]">
              Defina o valor da meta
            </span>
          ) : progress.reached ? (
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
          <span className="text-[color:var(--text-muted)]">Guarde pra ver a previsão</span>
        )}
      </div>
    </Link>
  );
}

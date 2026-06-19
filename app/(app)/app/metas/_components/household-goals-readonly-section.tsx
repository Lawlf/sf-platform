import { ChevronRight, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { SerializedHouseholdGoalForPersonalView } from "../../_actions/household-queries";

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--border-soft)]"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[color:var(--color-brand-800)] transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function HouseholdGoalsReadonlySection({
  goals,
}: {
  goals: SerializedHouseholdGoalForPersonalView[];
}) {
  if (goals.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Users size={16} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Metas da casa
          </h2>
        </div>
        <Link
          href={"/app/lar" as Route}
          className="focus-ring text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] hover:underline"
        >
          Abrir no Nosso lar
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {goals.map((goal) => (
          <Link
            key={goal.id}
            href={"/app/lar" as Route}
            className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  {goal.title}
                </span>
                <span className="flex-none text-[0.75rem] tabular-nums text-[color:var(--text-secondary)]">
                  {goal.savedBrl}
                  {goal.targetBrl ? ` / ${goal.targetBrl}` : ""}
                </span>
              </div>
              {goal.progressPct !== null ? <ProgressBar pct={goal.progressPct} /> : null}
            </div>
            <ChevronRight
              size={18}
              strokeWidth={2}
              className="flex-none text-[color:var(--text-muted)]"
              aria-hidden
            />
          </Link>
        ))}
      </div>

      <p className="px-1 text-[0.75rem] text-[color:var(--text-muted)]">
        Você guarda dinheiro nessas metas dentro do Nosso lar.
      </p>
    </section>
  );
}

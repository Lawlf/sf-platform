import { Lightbulb } from "lucide-react";

import type { HouseholdInsightPayload, HouseholdSnapshotPayload } from "../../_actions/household-queries";

interface Props {
  insight: HouseholdInsightPayload;
  snapshot: HouseholdSnapshotPayload;
}

const STATE_LABEL: Record<string, string> = {
  bleeding: "Casa no aperto",
  tight: "Casa no limite",
  no_cushion: "Casa sem reserva",
  ready_to_grow: "Pronta para crescer",
};

function committedColor(pct: number): string {
  if (pct >= 80) return "text-[color:var(--semantic-negative)]";
  if (pct >= 60) return "text-[color:var(--semantic-warning,#d97706)]";
  return "text-[color:var(--semantic-positive,#16a34a)]";
}

export function HouseholdInsightCard({ insight, snapshot }: Props) {
  const stateLabel = STATE_LABEL[insight.state] ?? insight.state;

  return (
    <section
      aria-label="Recomendação da casa"
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-5"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(242,142,37,0.10), transparent 60%)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Lightbulb size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[color:var(--text-primary)]">
            Recomendação da casa
          </h2>
          <span className="text-[0.75rem] text-[color:var(--text-muted)]">{stateLabel}</span>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            Comprometido da casa
          </span>
          <span className={`text-base font-bold tabular-nums ${committedColor(snapshot.committedPct)}`}>
            {snapshot.committedPct}%
          </span>
        </div>
      </div>

      {insight.dominantHeadline ? (
        <div className="flex flex-col gap-1">
          <p className="text-[0.9375rem] font-bold leading-[1.4] tracking-[-0.01em] text-[color:var(--text-primary)]">
            {insight.dominantHeadline}
          </p>
          {insight.dominantImpact ? (
            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
              {insight.dominantImpact}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
        A gente mostra a conta, a decisão é de vocês.
      </p>
    </section>
  );
}

import { TrendingUp } from "lucide-react";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";

interface Props {
  monthlyTotalFormatted: string;
  activeCount: number;
}

export function RendaHero({ monthlyTotalFormatted, activeCount }: Props) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Quanto entra por mês
          </div>
          <div className="mt-1 text-[2.25rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            <HideableValue>{monthlyTotalFormatted}</HideableValue>
          </div>
          <div className="mt-1.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
            {activeCount} {activeCount === 1 ? "fonte ativa" : "fontes ativas"}
          </div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--semantic-positive)]/12 text-[color:var(--semantic-positive)]">
          <TrendingUp size={20} strokeWidth={2} aria-hidden />
        </span>
      </div>
    </section>
  );
}

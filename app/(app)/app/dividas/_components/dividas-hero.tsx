import { Wallet } from "lucide-react";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";

interface Props {
  totalOwedFormatted: string;
  activeCount: number;
  outOfMonthCount: number;
  outOfMonthFormatted: string;
}

export function DividasHero({
  totalOwedFormatted,
  activeCount,
  outOfMonthCount,
  outOfMonthFormatted,
}: Props) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Quanto falta pagar
          </div>
          <div className="mt-1 text-[2.25rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            <HideableValue>{totalOwedFormatted}</HideableValue>
          </div>
          <div className="mt-1.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
            {activeCount} {activeCount === 1 ? "dívida ativa" : "dívidas ativas"}
          </div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/12 text-[color:var(--color-brand-700)]">
          <Wallet size={20} strokeWidth={2} aria-hidden />
        </span>
      </div>

      {outOfMonthCount > 0 ? (
        <div className="mt-4 border-t border-[color:var(--border-soft)] pt-3">
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Fora do seu mês
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 text-sm">
            <span className="font-bold text-[color:var(--text-primary)]">
              <HideableValue>{outOfMonthFormatted}</HideableValue>
            </span>
            <span className="text-[0.75rem] text-[color:var(--text-muted)]">
              em {outOfMonthCount} {outOfMonthCount === 1 ? "dívida" : "dívidas"} · não pesa no
              comprometido
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

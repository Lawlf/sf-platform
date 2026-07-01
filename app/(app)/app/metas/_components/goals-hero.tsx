import { Target } from "lucide-react";

interface GoalsHeroProps {
  activeCount: number;
  completedCount: number;
  avgProgressPct: number | null;
}

export function GoalsHero({ activeCount, completedCount, avgProgressPct }: GoalsHeroProps) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Progresso médio das metas ativas
          </div>
          {avgProgressPct !== null ? (
            <div
              className="mt-1 text-[2.25rem] font-extrabold leading-none text-[color:var(--text-primary)]"
              style={{ letterSpacing: "-0.5px" }}
            >
              {avgProgressPct.toFixed(0)}%
            </div>
          ) : (
            <div className="mt-1 text-[1.25rem] font-extrabold leading-tight text-[color:var(--text-primary)]">
              Nenhuma meta ativa com alvo ainda
            </div>
          )}
          <div className="mt-1.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
            {activeCount} {activeCount === 1 ? "meta ativa" : "metas ativas"}
          </div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/12 text-[color:var(--color-brand-700)]">
          <Target size={20} strokeWidth={2} aria-hidden />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Ativas
          </div>
          <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">{activeCount}</div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Concluídas
          </div>
          <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">{completedCount}</div>
        </div>
      </div>
    </section>
  );
}

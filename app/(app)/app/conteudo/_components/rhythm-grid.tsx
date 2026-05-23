const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"] as const;

export interface RhythmGridProps {
  modulesRead: number;
  todayIndex?: number;
}

export function RhythmGrid({ modulesRead, todayIndex }: RhythmGridProps) {
  const today = todayIndex ?? (() => {
    const dow = new Date().getDay();
    return (dow + 6) % 7;
  })();

  return (
    <section
      className="rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-md"
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <div className="font-serif text-[28px] font-bold leading-none tracking-[-0.02em] text-[color:var(--text-primary)]">
          <strong className="text-[color:var(--color-brand-800)]">{modulesRead}</strong>{" "}
          módulos
        </div>
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          Este mês
        </div>
      </div>
      <p className="mb-3 text-[12px] leading-[1.45] text-[color:var(--text-secondary)]">
        Sem corrida. Sem streak de "abriu o app". Aqui só conta módulo lido e aplicado.
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, idx) => (
          <div
            key={idx}
            className={`grid aspect-square place-items-center rounded-md text-[10px] font-bold ${
              idx === today
                ? "border-[1.5px] border-[color:var(--color-brand-500)] bg-[color:var(--surface-1)] text-[color:var(--color-brand-800)]"
                : "bg-[color:var(--border-soft)] text-[color:var(--text-muted)]"
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}

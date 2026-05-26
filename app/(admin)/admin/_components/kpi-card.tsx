interface Props {
  label: string;
  value: string;
  hint?: string;
}

export function KpiCard({ label, value, hint }: Props) {
  return (
    <div className="glass-light flex flex-col gap-1 rounded-2xl p-4">
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </p>
      <p className="text-[1.5rem] font-bold text-[color:var(--text-primary)]">{value}</p>
      {hint ? <p className="text-[0.75rem] text-[color:var(--text-secondary)]">{hint}</p> : null}
    </div>
  );
}

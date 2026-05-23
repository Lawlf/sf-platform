import { Activity, TrendingUp, Wallet } from "lucide-react";

export interface PerfilStatsProps {
  netWorthFormatted: string | null;
  netWorthIsNegative: boolean;
  incomeCommittedPct: number | null;
  assetCount: number;
}

function healthLabel(pct: number | null): { label: string; color: string } {
  if (pct === null) return { label: "Sem dados", color: "var(--text-muted)" };
  if (pct < 0.3) return { label: "Saudável", color: "var(--semantic-positive)" };
  if (pct < 0.5) return { label: "Atenção", color: "var(--semantic-warning)" };
  return { label: "Crítico", color: "var(--semantic-negative)" };
}

export function PerfilStats({
  netWorthFormatted,
  netWorthIsNegative,
  incomeCommittedPct,
  assetCount,
}: PerfilStatsProps) {
  const health = healthLabel(incomeCommittedPct);
  const pctDisplay =
    incomeCommittedPct !== null && Number.isFinite(incomeCommittedPct)
      ? `${Math.round(Math.max(0, Math.min(1, incomeCommittedPct)) * 100)}%`
      : "--";
  const nwColor = netWorthIsNegative
    ? "text-[color:var(--semantic-negative)]"
    : "text-[color:var(--semantic-positive)]";
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          <Activity size={12} strokeWidth={2} aria-hidden />
          Saúde
        </div>
        <div className="mt-1 text-[20px] font-extrabold" style={{ color: health.color }}>
          {health.label}
        </div>
        <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
          {pctDisplay} da renda comprometida
        </div>
      </div>
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          <TrendingUp size={12} strokeWidth={2} aria-hidden />
          Patrimônio
        </div>
        <div className={`mt-1 text-[20px] font-extrabold ${nwColor}`}>
          {netWorthFormatted ?? "R$ 0,00"}
        </div>
        <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
          {assetCount} {assetCount === 1 ? "ativo" : "ativos"}
        </div>
      </div>
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          <Wallet size={12} strokeWidth={2} aria-hidden />
          Consistência
        </div>
        <div className="mt-1 text-[20px] font-extrabold text-[color:var(--text-primary)]">
          Em breve
        </div>
        <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
          Streak de uso e marcos.
        </div>
      </div>
    </section>
  );
}

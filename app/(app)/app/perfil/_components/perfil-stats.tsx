import { Activity, ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { ConsistencyCardView } from "@/application/use-cases/achievement/get-consistency-card.use-case";
import { Money } from "@/domain/value-objects/money.vo";

export interface PerfilStatsProps {
  incomeCommittedPct: number | null;
  consistency: ConsistencyCardView;
}

function healthLabel(pct: number | null): { label: string; color: string } {
  if (pct === null) return { label: "Sem dados", color: "var(--text-muted)" };
  if (pct < 0.3) return { label: "Saudável", color: "var(--semantic-positive)" };
  if (pct < 0.5) return { label: "Atenção", color: "var(--semantic-warning)" };
  return { label: "Crítico", color: "var(--semantic-negative)" };
}

function consistencyValue(c: ConsistencyCardView): string {
  return c.monthsActive === 0 ? "Começo" : c.tier;
}

function tierLabelAt(milestone: number): string {
  if (milestone >= 60) return "Cinco anos firme";
  if (milestone >= 24) return "Dois anos firme";
  if (milestone >= 12) return "Um ano firme";
  if (milestone >= 6) return "Constância";
  return "No ritmo";
}

function consistencySubline(c: ConsistencyCardView): string {
  const d = c.delta;
  if (d) {
    if (d.direction === "flat") return `Estável desde ${d.sinceLabel}`;
    if (d.lever === "committed") {
      const sign = d.direction === "positive" ? "-" : "+";
      const points = String((d.pointsBps ?? 0) / 100).replace(".", ",");
      return `Comprometido: ${sign}${points} pontos desde ${d.sinceLabel}`;
    }
    const money = Money.fromCents(d.amountCents ?? 0n).format();
    if (d.lever === "debt") {
      return d.direction === "positive"
        ? `Dívida abatida: ${money} desde ${d.sinceLabel}`
        : `Dívida: +${money} desde ${d.sinceLabel}`;
    }
    const label = d.lever === "reserve" ? "Reserva" : "Patrimônio";
    const sign = d.direction === "positive" ? "+" : "-";
    return `${label}: ${sign}${money} desde ${d.sinceLabel}`;
  }
  if (c.monthsActive === 0) return "Feche seu primeiro mês pra começar";
  if (c.milestone === null) return "Sua maior sequência de meses ativos";
  return `${tierLabelAt(c.milestone)} em ${c.monthsToNext} ${c.monthsToNext === 1 ? "mês" : "meses"}`;
}

export function PerfilStats({ incomeCommittedPct, consistency }: PerfilStatsProps) {
  const health = healthLabel(incomeCommittedPct);
  const pctDisplay =
    incomeCommittedPct !== null && Number.isFinite(incomeCommittedPct)
      ? `${Math.round(Math.max(0, Math.min(1, incomeCommittedPct)) * 100)}%`
      : "--";
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          <Activity size={12} strokeWidth={2} aria-hidden />
          Saúde
        </div>
        <div className="mt-1 text-[1.25rem] font-extrabold" style={{ color: health.color }}>
          {health.label}
        </div>
        <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          {pctDisplay} da renda comprometida
        </div>
      </div>
      <Link
        href={"/app/conquistas" as Route}
        className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:border-[color:var(--border-strong)]"
      >
        <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          <ArrowUpRight size={12} strokeWidth={2} aria-hidden />
          Consistência
        </div>
        <div className="mt-1 text-[1.25rem] font-extrabold text-[color:var(--text-primary)]">
          {consistencyValue(consistency)}
        </div>
        <div className="mt-2 flex gap-[2px]" aria-hidden>
          {consistency.trail.map((active, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${
                active
                  ? "bg-[color:var(--color-brand-500)]"
                  : "bg-[color:var(--border-strong)]"
              }`}
            />
          ))}
        </div>
        <div className="mt-1.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          {consistencySubline(consistency)}
        </div>
      </Link>
    </section>
  );
}

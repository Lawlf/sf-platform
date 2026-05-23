import { ChevronDown, ChevronRight, ChevronUp, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import type { SerializedMonthlyDataPoint } from "../../_actions/timeline-queries";

import { MonthCard } from "./month-card";

export type TimelineFocus = "balance" | "networth" | "income";

export interface MonthSectionProps {
  point: SerializedMonthlyDataPoint;
  previousPoint: SerializedMonthlyDataPoint | null;
  focus: TimelineFocus;
  isCurrent: boolean;
  isFeatured?: boolean;
}

function computePct(current: bigint, previous: bigint): number | null {
  if (previous === 0n) return null;
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
  return ((c - p) / Math.abs(p)) * 100;
}

function pickValueCents(point: SerializedMonthlyDataPoint, focus: TimelineFocus): bigint {
  switch (focus) {
    case "balance":
      return BigInt(point.freeBalance.cents);
    case "networth":
      return BigInt(point.netWorth.cents);
    case "income":
      return BigInt(point.totalIncome.cents);
  }
}

export function MonthSection({
  point,
  previousPoint,
  focus,
  isCurrent,
  isFeatured = false,
}: MonthSectionProps) {
  const compare = previousPoint
    ? computePct(pickValueCents(point, focus), pickValueCents(previousPoint, focus))
    : null;

  const compareLabel = previousPoint
    ? compare === null
      ? null
      : {
          pct: Math.round(Math.abs(compare)),
          isUp: compare > 0,
          isFlat: compare === 0,
          previousLabel: shortMonthLabel(previousPoint.monthLabel),
        }
    : null;

  const ariaLabel = `Ver detalhes de ${point.monthLabel}. ${ariaLabelFor(point)}`;
  const href = `/app/linha-do-tempo/${point.monthIso}` as Route;

  return (
    <section
      id={`month-${point.monthIso}`}
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <MonthChip label={point.monthLabel} isCurrent={isCurrent} />
        <div className="flex items-center gap-2">
          {isFeatured ? <BestMonthBadge /> : null}
          {compareLabel ? <ComparePill {...compareLabel} /> : null}
        </div>
      </header>
      <Link
        href={href}
        aria-label={ariaLabel}
        className="focus-ring relative block w-full rounded-2xl text-left transition-transform active:scale-[0.997]"
      >
        <MonthCard
          point={point}
          previousPoint={previousPoint}
          focus={focus}
          isCurrent={isCurrent}
          isFeatured={isFeatured}
        />
        <ChevronRight
          size={18}
          strokeWidth={2.25}
          aria-hidden
          className="absolute right-3 top-3 text-[color:var(--text-muted)]"
        />
      </Link>
    </section>
  );
}

function MonthChip({ label, isCurrent }: { label: string; isCurrent: boolean }) {
  // label is like "Mai 26" (from MonthYear.format()). Split for chip display.
  const parts = label.split(" ");
  const name = parts[0] ?? label;
  const year = parts[1] ?? "";

  if (isCurrent) {
    return (
      <span className="inline-flex items-baseline gap-1.5 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-3 py-1 text-[0.6875rem] font-extrabold uppercase tracking-[0.5px] text-white shadow-[0_4px_12px_rgba(239,122,26,0.35)]">
        {name}
        <span className="text-[0.5625rem] font-bold text-white/85">HOJE</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-[color:var(--color-brand-500)]/[0.12] px-3 py-1 text-[0.6875rem] font-extrabold uppercase tracking-[0.5px] text-[color:var(--color-brand-800)]">
      {name}
      {year ? <span className="text-[0.5625rem] font-bold opacity-55">{year}</span> : null}
    </span>
  );
}

function ComparePill({
  pct,
  isUp,
  isFlat,
  previousLabel,
}: {
  pct: number;
  isUp: boolean;
  isFlat: boolean;
  previousLabel: string;
}) {
  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-bold text-[color:var(--text-muted)]">
        Igual a {previousLabel}
      </span>
    );
  }
  const Cls = isUp
    ? "bg-[color:var(--semantic-positive)]/[0.12] text-[color:var(--semantic-positive)]"
    : "bg-[color:var(--semantic-negative)]/[0.12] text-[color:var(--semantic-negative)]";
  const Icon = isUp ? ChevronUp : ChevronDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold ${Cls}`}
    >
      <Icon size={10} strokeWidth={3} aria-hidden />
      {pct}% vs {previousLabel}
    </span>
  );
}

function BestMonthBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-2 py-0.5 text-[0.625rem] font-extrabold uppercase tracking-[0.5px] text-white shadow-[0_3px_8px_rgba(239,122,26,0.3)]">
      <Star size={10} strokeWidth={2.5} aria-hidden />
      Melhor mês
    </span>
  );
}

function shortMonthLabel(label: string): string {
  // "Mai 26" -> "Mai"
  return label.split(" ")[0] ?? label;
}

function ariaLabelFor(point: SerializedMonthlyDataPoint): string {
  return `${point.monthLabel}. Saldo livre ${point.freeBalance.formatted}. Renda ${point.totalIncome.formatted}. Dívidas pagas ${point.totalDebtPayments.formatted}. Patrimônio ${point.netWorth.formatted}.`;
}

// Avoid unused import warning if ReactNode unused
export type _ReactNodeRef = ReactNode;

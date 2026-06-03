"use client";

import { ChevronRight, MoveRight } from "lucide-react";

import { HideableValue } from "./money-visibility/hideable-value.client";

export interface MovementCardProps {
  rendaFormatted: string;
  despesasFormatted: string;
  parcelasFormatted: string;
  saldoFormatted: string;
  saldoIsNegative: boolean;
  monthLabel: string;
  onClick: () => void;
}

export function MovementCard({
  rendaFormatted,
  despesasFormatted,
  parcelasFormatted,
  saldoFormatted,
  saldoIsNegative,
  monthLabel,
  onClick,
}: MovementCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Movimento de ${monthLabel}. Saldo livre ${saldoFormatted}. Toque para ver detalhes.`}
      className="focus-ring group w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[18px] text-left backdrop-blur-md transition-all hover:bg-[color:var(--surface-1)] hover:shadow-[0_8px_24px_rgba(31,29,28,0.06)]"
    >
      <header className="mb-[14px] flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--semantic-positive)]/[0.12] px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--semantic-positive)]">
          <MoveRight size={11} strokeWidth={2.5} aria-hidden />
          Movimento do mês
        </span>
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[color:var(--text-primary)]/[0.04] text-[color:var(--text-muted)] transition-transform group-hover:translate-x-0.5">
          <ChevronRight size={12} strokeWidth={2.5} aria-hidden />
        </span>
      </header>

      <EqRow
        sign="plus"
        name="Renda"
        hint="Entra na sua conta"
        value={rendaFormatted}
        tone="positive"
      />
      <EqRow
        sign="minus"
        name="Despesas"
        hint="Sai da sua conta"
        value={despesasFormatted}
        tone="negative"
      />
      <EqRow
        sign="minus"
        name="Parcelas"
        hint="Sai pra pagar dívidas"
        value={parcelasFormatted}
        tone="negative"
      />

      <ResultLine
        head="Saldo livre do mês"
        sub="O que sobrou pra você"
        value={saldoFormatted}
        tone={saldoIsNegative ? "negative" : "positive"}
      />
    </button>
  );
}

interface EqRowProps {
  sign: "plus" | "minus" | "brand";
  name: string;
  hint: string;
  value: string;
  tone: "positive" | "negative" | "brand";
}

function EqRow({ sign, name, hint, value, tone }: EqRowProps) {
  const iconBg =
    sign === "plus"
      ? "bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]"
      : sign === "minus"
        ? "bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]"
        : "bg-[color:var(--color-brand-500)]/[0.16] text-[color:var(--color-brand-800)]";
  const valueColor =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : "text-[color:var(--color-brand-800)]";
  const glyph = sign === "minus" ? "−" : "+";
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-[color:var(--border-soft)] py-2 last-of-type:border-b-0">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-[0.875rem] font-extrabold ${iconBg}`}
          aria-hidden
        >
          {glyph}
        </span>
        <span className="flex flex-col">
          <span className="text-[0.8125rem] font-bold leading-tight text-[color:var(--text-primary)]">
            {name}
          </span>
          <span className="mt-0.5 text-[0.625rem] text-[color:var(--text-muted)]">{hint}</span>
        </span>
      </div>
      <span className={`text-[0.9375rem] font-extrabold tracking-[-0.2px] ${valueColor}`}>
        <HideableValue>{value}</HideableValue>
      </span>
    </div>
  );
}

interface ResultLineProps {
  head: string;
  sub: string;
  value: string;
  tone: "positive" | "negative" | "brand";
}

export function ResultLine({ head, sub, value, tone }: ResultLineProps) {
  const valColor =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : "text-[color:var(--color-brand-800)]";
  return (
    <div className="mt-3.5 flex items-center justify-between gap-3 rounded-[14px] border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/10 px-4 py-3.5 shadow-[0_2px_8px_rgba(31,29,28,0.04)]">
      <div className="flex min-w-0 flex-col">
        <span className="text-[0.5625rem] font-extrabold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]/85">
          {head}
        </span>
        <span className="mt-0.5 text-[0.625rem] text-[color:var(--text-muted)]">{sub}</span>
      </div>
      <span className={`text-[1.5rem] font-extrabold tracking-[-0.4px] ${valColor}`}>
        <HideableValue>{value}</HideableValue>
      </span>
    </div>
  );
}

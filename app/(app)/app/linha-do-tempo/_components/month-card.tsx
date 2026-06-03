import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";

import type { SerializedMonthlyDataPoint } from "../../_actions/timeline-queries";

import type { TimelineFocus } from "./month-section";

export interface MonthCardProps {
  point: SerializedMonthlyDataPoint;
  previousPoint: SerializedMonthlyDataPoint | null;
  focus: TimelineFocus;
  isCurrent: boolean;
  isFeatured?: boolean;
}

function pickFocusValue(
  point: SerializedMonthlyDataPoint,
  focus: TimelineFocus,
): { cents: bigint; formatted: string; isNegative: boolean } {
  switch (focus) {
    case "balance":
      return {
        cents: BigInt(point.freeBalance.cents),
        formatted: point.freeBalance.formatted,
        isNegative: BigInt(point.freeBalance.cents) < 0n,
      };
    case "networth":
      return {
        cents: BigInt(point.netWorth.cents),
        formatted: point.netWorth.formatted,
        isNegative: BigInt(point.netWorth.cents) < 0n,
      };
    case "income":
      return {
        cents: BigInt(point.totalIncome.cents),
        formatted: point.totalIncome.formatted,
        isNegative: false,
      };
  }
}

function CoachLine({
  monthLabel,
  focus,
  isCurrent,
}: {
  monthLabel: string;
  focus: TimelineFocus;
  isCurrent: boolean;
}) {
  const monthName = monthLabel.split(" ")[0] ?? monthLabel;
  const verbo = isCurrent ? "está fechando" : "fechou";
  switch (focus) {
    case "balance":
      return (
        <>
          Você {verbo} <strong>{monthName}</strong> com
        </>
      );
    case "networth":
      return (
        <>
          Patrimônio em <strong>{monthName}</strong>
        </>
      );
    case "income":
      return (
        <>
          Renda em <strong>{monthName}</strong>
        </>
      );
  }
}

function valueColor(focus: TimelineFocus, isNegative: boolean): string {
  if (focus === "networth") return "text-[color:var(--color-brand-800)]";
  if (focus === "income") return "text-[color:var(--semantic-positive)]";
  // balance
  return isNegative
    ? "text-[color:var(--semantic-negative)]"
    : "text-[color:var(--semantic-positive)]";
}

function pctWidth(value: bigint, max: bigint): number {
  if (max === 0n) return 0;
  const v = Number(value);
  const m = Number(max);
  if (!Number.isFinite(v) || !Number.isFinite(m) || m === 0) return 0;
  const pct = Math.abs(v / m) * 100;
  return Math.min(100, Math.max(0, pct));
}

function formatDeltaCents(deltaCents: bigint): { formatted: string; isPositive: boolean } {
  const isPositive = deltaCents >= 0n;
  const abs = deltaCents < 0n ? -deltaCents : deltaCents;
  const reais = Number(abs) / 100;
  const formatted = reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  return { formatted: `${isPositive ? "+" : "-"}${formatted}`, isPositive };
}

export function MonthCard({
  point,
  previousPoint,
  focus,
  isCurrent,
  isFeatured = false,
}: MonthCardProps) {
  const focusVal = pickFocusValue(point, focus);
  const cardClass = isCurrent
    ? "border-[1.5px] border-[color:var(--color-brand-500)]/40 bg-[color:var(--surface-1)] shadow-[0_8px_24px_rgba(239,122,26,0.12)]"
    : isFeatured
      ? "border-[1.5px] border-[color:var(--color-brand-500)]/40 bg-[color:var(--surface-1)] shadow-[0_12px_28px_rgba(239,122,26,0.16)]"
      : "border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]";

  // Bars: foreground = current month value, ghost = previous month value, normalized by max.
  // Após o merge Expense -> Debt, `totalDebtPayments` já inclui compromissos
  // recorrentes/pontuais. A barra "Despesas" deixou de existir como série
  // independente.
  const currentIncome = BigInt(point.totalIncome.cents);
  const currentDebt = BigInt(point.totalDebtPayments.cents);
  const prevIncome = previousPoint ? BigInt(previousPoint.totalIncome.cents) : 0n;
  const prevDebt = previousPoint ? BigInt(previousPoint.totalDebtPayments.cents) : 0n;
  const maxIncome = currentIncome > prevIncome ? currentIncome : prevIncome;
  const maxDebt = currentDebt > prevDebt ? currentDebt : prevDebt;

  const incomeFgWidth = pctWidth(currentIncome, maxIncome);
  const incomeGhostWidth = pctWidth(prevIncome, maxIncome);
  const debtFgWidth = pctWidth(currentDebt, maxDebt);
  const debtGhostWidth = pctWidth(prevDebt, maxDebt);

  // Patrimônio delta
  const deltaCents = previousPoint
    ? BigInt(point.netWorth.cents) - BigInt(previousPoint.netWorth.cents)
    : null;
  const delta = deltaCents !== null ? formatDeltaCents(deltaCents) : null;
  const previousLabel = previousPoint
    ? (previousPoint.monthLabel.split(" ")[0] ?? "anterior")
    : null;

  return (
    <article className={`rounded-2xl px-4 py-4 backdrop-blur-md md:px-5 ${cardClass}`}>
      <p className="text-[0.8125rem] font-semibold leading-snug text-[color:var(--text-secondary)]">
        <CoachLine monthLabel={point.monthLabel} focus={focus} isCurrent={isCurrent} />
      </p>
      <div
        className={`mt-1 text-[1.625rem] font-extrabold leading-none tracking-[-0.6px] ${valueColor(focus, focusVal.isNegative)}`}
      >
        <HideableValue>{focusVal.formatted}</HideableValue>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BarBlock
          label="Renda"
          value={point.totalIncome.formatted}
          colorClass="text-[color:var(--semantic-positive)]"
          ghostWidth={incomeGhostWidth}
          fgWidth={incomeFgWidth}
          fgClass="bg-[color:var(--semantic-positive)]"
        />
        <BarBlock
          label="Saídas"
          value={point.totalDebtPayments.formatted}
          colorClass="text-[color:var(--semantic-negative)]"
          ghostWidth={debtGhostWidth}
          fgWidth={debtFgWidth}
          fgClass="bg-[color:var(--semantic-negative)]"
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border-soft)] pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
            Patrimônio
          </span>
          <span className="text-[0.875rem] font-extrabold text-[color:var(--color-brand-800)]">
            <HideableValue>{point.netWorth.formatted}</HideableValue>
          </span>
        </div>
        {delta && previousLabel ? (
          <span
            className={`rounded-full px-2 py-1 text-[0.625rem] font-bold ${
              delta.isPositive
                ? "bg-[color:var(--semantic-positive)]/[0.12] text-[color:var(--semantic-positive)]"
                : "bg-[color:var(--semantic-negative)]/[0.12] text-[color:var(--semantic-negative)]"
            }`}
          >
            <HideableValue>{delta.formatted}</HideableValue> vs {previousLabel}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function BarBlock({
  label,
  value,
  colorClass,
  ghostWidth,
  fgWidth,
  fgClass,
}: {
  label: string;
  value: string;
  colorClass: string;
  ghostWidth: number;
  fgWidth: number;
  fgClass: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
          {label}
        </span>
        <span className={`text-[0.75rem] font-extrabold ${colorClass}`}>
          <HideableValue>{value}</HideableValue>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        {ghostWidth > 0 ? (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--text-muted)]/15"
            style={{ width: `${ghostWidth}%` }}
          />
        ) : null}
        <div
          aria-hidden
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${fgClass}`}
          style={{ width: `${fgWidth}%` }}
        />
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

import type { DebtEntity, DebtKind, DebtStatus } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { dateOnlyFormat } from "@/shared/format/date-only";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";
import { terms } from "../../../_lib/copy/terms";

const KIND_LABEL: Record<DebtKind, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo ou crediário",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
  recurring: "Conta fixa do mês",
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  active: "Ativa",
  paid_off: "Quitada",
  written_off: "Fora do seu mês",
};

function statusLabel(debt: DebtEntity): string {
  if (debt.kind === "recurring" && debt.status === "paid_off") return "Encerrada";
  return STATUS_LABEL[debt.status];
}

const FREQUENCY_LABEL = {
  monthly: "mês",
  weekly: "semana",
  annual: "ano",
} as const;

const DATE_FMT = dateOnlyFormat({ dateStyle: "short" });

function statusBadgeClass(status: DebtStatus): string {
  if (status === "active")
    return "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]";
  if (status === "paid_off")
    return "bg-[color:var(--semantic-positive)]/15 text-[color:var(--semantic-positive)]";
  return "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]";
}

function buildHeaderStats(
  debt: DebtEntity,
  categoryLabelText: string,
  scheduleEndDate: Date | null,
): { label: string; value: string; isCurrency?: boolean }[] {
  if (debt.kind === "recurring") {
    const freqLabel = FREQUENCY_LABEL[debt.recurringFrequency];
    const categoryLabel = categoryLabelText;
    const perYearMultiplier =
      debt.recurringFrequency === "weekly" ? 52 : debt.recurringFrequency === "annual" ? 1 : 12;
    return [
      {
        label: `Por ${freqLabel}`,
        value: Money.fromCents(debt.recurringAmountCents).format(),
        isCurrency: true,
      },
      {
        label: "No ano",
        value: Money.fromCents(debt.recurringAmountCents * BigInt(perYearMultiplier)).format(),
        isCurrency: true,
      },
      { label: "Categoria", value: categoryLabel },
      { label: "Início", value: DATE_FMT.format(debt.startDate) },
    ];
  }
  const secondary =
    debt.kind === "credit_card"
      ? debt.creditLimit
        ? { label: "Limite", value: debt.creditLimit.format(), isCurrency: true }
        : { label: "Limite", value: "Não informado" }
      : (() => {
          const endDate = debt.expectedEndDate ?? scheduleEndDate;
          return {
            label: "Termina em",
            value: endDate ? DATE_FMT.format(endDate) : "Não informado",
          };
        })();
  return [
    { label: terms.debtRemaining, value: debt.currentBalance.format(), isCurrency: true },
    { label: "Valor original", value: debt.originalPrincipal.format(), isCurrency: true },
    { label: "Início", value: DATE_FMT.format(debt.startDate) },
    secondary,
  ];
}

interface Props {
  debt: DebtEntity;
  categoryLabelText?: string;
  scheduleEndDate?: Date | null;
  action?: ReactNode;
}

export function DebtHeader({ debt, categoryLabelText, scheduleEndDate = null, action }: Props) {
  const headerStats = buildHeaderStats(debt, categoryLabelText ?? "Outros", scheduleEndDate);

  const originalCents = debt.kind === "recurring" ? 0n : debt.originalPrincipal.toCents();
  const paidCents = debt.kind === "recurring" ? 0n : originalCents - debt.currentBalance.toCents();
  const paidPct = originalCents > 0n ? Number((paidCents * 10000n) / originalCents) / 100 : 0;
  const paidPctClamped = Math.max(0, Math.min(100, paidPct));
  const showProgress = debt.kind !== "recurring" && originalCents > 0n;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {KIND_LABEL[debt.kind]}
          </div>
          <h1
            className="mt-1 text-[1.5rem] font-extrabold leading-tight text-[color:var(--text-primary)]"
            style={{ letterSpacing: "-0.4px" }}
          >
            {debt.label}
          </h1>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${statusBadgeClass(debt.status)}`}
          >
            {statusLabel(debt)}
          </span>
        </div>
        {action}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm">
        {headerStats.map((s) => (
          <div key={s.label}>
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              {s.label}
            </div>
            <div className="mt-0.5 font-bold tabular-nums text-[color:var(--text-primary)]">
              {s.isCurrency ? <HideableValue>{s.value}</HideableValue> : s.value}
            </div>
          </div>
        ))}
      </div>
      {showProgress ? (
        <div className="mt-3 border-t border-[color:var(--border-soft)] pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
            <div
              className="h-full rounded-full bg-[color:var(--color-brand-500)]"
              style={{ width: `${paidPctClamped}%` }}
            />
          </div>
          <div className="mt-1.5 text-[0.75rem] font-semibold tabular-nums text-[color:var(--text-secondary)]">
            <HideableValue>{debt.currentBalance.format()}</HideableValue> restante ·{" "}
            {paidPctClamped.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% pago
          </div>
        </div>
      ) : null}
    </section>
  );
}

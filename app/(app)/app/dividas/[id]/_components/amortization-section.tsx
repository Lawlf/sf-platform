import type { ReactNode } from "react";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { computeInstallmentDueDates } from "@/domain/services/debt-calendar.service";
import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { Money } from "@/domain/value-objects/money.vo";

import { HowItWorksSheet } from "../../../_components/how-it-works-sheet";
import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";

import { AmortizationView } from "./amortization-view.client";
import type { PaymentRowData } from "./payment-detail-sheet.client";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function paymentToRow(p: DebtPaymentEntity): PaymentRowData {
  return {
    id: p.id,
    dateLabel: DATE_FMT.format(p.paidAt),
    amountFormatted: p.amount.format(),
    principalFormatted: p.principalPortion.format(),
    interestFormatted: p.interestPortion.format(),
    isExtra: p.isExtra,
    hasNoteOrAttachment: false,
  };
}

function formatMonthLabel(date: Date): string {
  const s = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMonthShort(date: Date): string {
  const s = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  debt: DebtEntity;
  amortization: AmortizationSchedule;
  payments: DebtPaymentEntity[];
  isPro: boolean;
}

export function AmortizationSection({ debt, amortization, payments, isPro }: Props) {
  const installments = amortization.installments;
  const sumCents = (pick: (r: (typeof installments)[number]) => Money): bigint =>
    installments.reduce<bigint>((acc, row) => acc + pick(row).toCents(), 0n);
  const totalInstallmentCents = sumCents((r) => r.installment);
  const totalPrincipalCents = sumCents((r) => r.principal);
  const totalInterestCents = sumCents((r) => r.interest);

  const paidPrincipalCents = debt.originalPrincipal.toCents() - debt.currentBalance.toCents();
  const paidPct =
    totalPrincipalCents > 0n
      ? Number((paidPrincipalCents * 10000n) / totalPrincipalCents) / 100
      : 0;
  const paidPctClamped = Math.max(0, Math.min(100, paidPct));

  const balCents = debt.currentBalance.toCents();
  // Parcela paga: o saldo já caiu até (ou abaixo de) o que sobraria após ela.
  const isInstallmentPaid = (remainingCents: bigint) => remainingCents >= balCents;
  // Mês atual: a primeira parcela ainda não paga.
  const currentMonth = (() => {
    for (const row of installments) {
      if (!isInstallmentPaid(row.remainingBalance.toCents())) return row.month;
    }
    return installments[installments.length - 1]?.month ?? null;
  })();

  const hasInterest = totalInterestCents > 0n;
  const dueDateList = computeInstallmentDueDates(debt, amortization);
  const metaByMonth = new Map(
    dueDateList.map((d) => [
      d.month,
      { label: formatMonthLabel(d.dueDate), year: d.dueDate.getFullYear(), short: formatMonthShort(d.dueDate) },
    ]),
  );
  const monthByYearMonth = new Map(
    dueDateList.map((d) => [`${d.dueDate.getFullYear()}-${d.dueDate.getMonth()}`, d.month]),
  );
  const allPayments = payments.map(paymentToRow);
  const paymentByMonth: Record<number, PaymentRowData> = {};
  for (const p of payments) {
    const m = monthByYearMonth.get(`${p.paidAt.getFullYear()}-${p.paidAt.getMonth()}`);
    if (m != null && !paymentByMonth[m]) paymentByMonth[m] = paymentToRow(p);
  }
  const chartRows = installments.map((row) => {
    const meta = metaByMonth.get(row.month);
    return {
      month: row.month,
      monthLabel: meta?.label ?? `Parcela ${row.month}`,
      year: meta?.year ?? 0,
      monthShort: meta?.short ?? String(row.month),
      paid: isInstallmentPaid(row.remainingBalance.toCents()),
      abate: Number(row.principal.toCents()) / 100,
      juro: Number(row.interest.toCents()) / 100,
      installmentLabel: row.installment.format(),
      abateLabel: row.principal.format(),
      juroLabel: row.interest.format(),
      remainingBalanceLabel: row.remainingBalance.format(),
    };
  });
  const paidCount =
    currentMonth != null ? installments.filter((row) => row.month < currentMonth).length : 0;
  const zeroInfo = hasInterest
    ? null
    : {
        count: installments.length,
        perInstallmentLabel: (installments[0]?.installment ?? Money.fromCents(0n)).format(),
        paid: paidCount,
        remaining: installments.length - paidCount,
      };

  return (
    <>
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Cronograma de parcelas
          </h2>
          <HowItWorksSheet topic="cronograma-parcelas" variant="brand" />
        </div>
        {paidPctClamped > 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[color:var(--color-brand-500)]"
                style={{ width: `${paidPctClamped}%` }}
              />
            </div>
            <span className="shrink-0 text-[0.6875rem] font-semibold tabular-nums text-[color:var(--text-secondary)]">
              {paidPctClamped.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% pago
            </span>
          </div>
        ) : null}
        {hasInterest ? (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3">
            <Stat
              label="Total a pagar"
              value={
                <HideableValue>{Money.fromCents(totalInstallmentCents).format()}</HideableValue>
              }
            />
            <Stat
              label="Juros totais"
              value={<HideableValue>{Money.fromCents(totalInterestCents).format()}</HideableValue>}
            />
          </div>
        ) : null}
        <div className="mt-3">
          <AmortizationView
            hasInterest={hasInterest}
            chartRows={chartRows}
            currentMonth={currentMonth}
            zeroInfo={zeroInfo}
            paymentByMonth={paymentByMonth}
            allPayments={allPayments}
            isPro={isPro}
          />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-[color:var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { cn } from "@/lib/utils";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";

import {
  ABATE_COLOR,
  AmortizationChart,
  type AmortizationChartRow,
  JURO_COLOR,
} from "./amortization-chart.client";
import { PaymentDetailSheet, type PaymentRowData } from "./payment-detail-sheet.client";
import { PaymentsList } from "./payments-list.client";

interface ZeroInterestInfo {
  count: number;
  perInstallmentLabel: string;
  paid: number;
  remaining: number;
}

interface Props {
  hasInterest: boolean;
  chartRows: AmortizationChartRow[];
  currentMonth: number | null;
  zeroInfo: ZeroInterestInfo | null;
  paymentByMonth: Record<number, PaymentRowData>;
  allPayments: PaymentRowData[];
  isPro: boolean;
}

export function AmortizationView({
  hasInterest,
  chartRows,
  currentMonth,
  zeroInfo,
  paymentByMonth,
  allPayments,
  isPro,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth ?? chartRows[0]?.month ?? 1);
  const [detailPayment, setDetailPayment] = useState<PaymentRowData | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const selectedIndex = chartRows.findIndex((r) => r.month === selectedMonth);
  const selected = chartRows[selectedIndex];
  const isPaidMonth = selected?.paid ?? false;
  const matchedPayment = paymentByMonth[selectedMonth];

  function step(delta: number) {
    const next = chartRows[selectedIndex + delta];
    if (next) setSelectedMonth(next.month);
  }

  if (!hasInterest) {
    return zeroInfo ? (
      <p className="text-[0.875rem] leading-relaxed text-[color:var(--text-secondary)]">
        {zeroInfo.count} parcelas de <HideableValue>{zeroInfo.perInstallmentLabel}</HideableValue>,
        sem juro.{" "}
        {zeroInfo.paid > 0
          ? `Você já pagou ${zeroInfo.paid}, faltam ${zeroInfo.remaining}.`
          : `Faltam ${zeroInfo.remaining}.`}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-4">
      {selected ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={selectedIndex <= 0}
            aria-label="Mês anterior"
            className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-30"
          >
            <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
          </button>
          <MonthPicker rows={chartRows} selectedMonth={selectedMonth} onSelect={setSelectedMonth}>
            <button
              type="button"
              className="focus-ring min-w-0 rounded-lg px-2 py-1 text-center transition-colors hover:bg-[color:var(--surface-3)]"
            >
              <span className="flex items-center justify-center gap-1">
                <span className="truncate text-base font-bold text-[color:var(--text-primary)]">
                  {selected.monthLabel}
                </span>
                <ChevronDown
                  size={15}
                  strokeWidth={2.25}
                  aria-hidden
                  className="shrink-0 text-[color:var(--text-muted)]"
                />
              </span>
              <span className="block text-[0.6875rem] font-medium text-[color:var(--text-muted)]">
                Parcela {selected.month} de {chartRows.length}
              </span>
            </button>
          </MonthPicker>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={selectedIndex >= chartRows.length - 1}
            aria-label="Próximo mês"
            className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-30"
          >
            <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : null}

      <AmortizationChart rows={chartRows} selectedMonth={selectedMonth} onSelect={setSelectedMonth} />

      {selected ? (
        <div aria-live="polite" className="border-t border-[color:var(--border-soft)] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor da parcela" value={selected.installmentLabel} />
            <Field label="Saldo depois" value={selected.remainingBalanceLabel} />
            <Field label="Abate a dívida" value={selected.abateLabel} dotColor={ABATE_COLOR} />
            <Field label="Juro" value={selected.juroLabel} dotColor={JURO_COLOR} />
          </div>

          {matchedPayment ? (
            <button
              type="button"
              onClick={() => setDetailPayment(matchedPayment)}
              className="focus-ring mt-3 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] underline underline-offset-2"
            >
              Ver detalhes do registro de pagamento
            </button>
          ) : isPaidMonth && allPayments.length > 0 ? (
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="focus-ring mt-3 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] underline underline-offset-2"
            >
              Ver pagamentos
            </button>
          ) : null}
        </div>
      ) : null}

      <PaymentDetailSheet
        payment={detailPayment}
        isPro={isPro}
        onClose={() => setDetailPayment(null)}
      />

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <SheetHeader>
            <SheetTitle>Pagamentos registrados</SheetTitle>
          </SheetHeader>
          <PaymentsList payments={allPayments} isPro={isPro} collapsedByDefault={false} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MonthPicker({
  rows,
  selectedMonth,
  onSelect,
  children,
}: {
  rows: AmortizationChartRow[];
  selectedMonth: number;
  onSelect: (month: number) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selectedYear = rows.find((r) => r.month === selectedMonth)?.year ?? rows[0]?.year ?? 0;
  const [activeYear, setActiveYear] = useState(selectedYear);

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const monthsOfYear = rows.filter((r) => r.year === activeYear);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setActiveYear(selectedYear);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />
        <SheetHeader>
          <SheetTitle>Escolher mês</SheetTitle>
        </SheetHeader>

        {years.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setActiveYear(year)}
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors",
                  year === activeYear
                    ? "bg-[color:var(--color-brand-500)] text-white"
                    : "bg-[color:var(--surface-3)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]",
                )}
              >
                {year}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {monthsOfYear.map((r) => {
            const isSel = r.month === selectedMonth;
            return (
              <button
                key={r.month}
                type="button"
                onClick={() => {
                  onSelect(r.month);
                  setOpen(false);
                }}
                className={cn(
                  "focus-ring flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors",
                  isSel
                    ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.12]"
                    : "border-[color:var(--border-soft)] hover:bg-[color:var(--surface-2)]",
                )}
              >
                <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                  {r.monthShort}
                </span>
                <span className="text-[0.625rem] font-medium text-[color:var(--text-muted)]">
                  Parcela {r.month}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, dotColor }: { label: string; value: string; dotColor?: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {dotColor ? (
          <span className="inline-block size-2 rounded-sm" style={{ background: dotColor }} />
        ) : null}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-[color:var(--text-primary)]">
        <HideableValue>{value}</HideableValue>
      </p>
    </div>
  );
}

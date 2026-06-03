"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, Repeat, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";


import { fetchMonthDetail, type SerializedMonthDetail } from "../../_actions/timeline-month-detail";
import { type SerializedMonthlyDataPoint } from "../../_actions/timeline-queries";
import { queryKeys } from "../../_lib/query-keys";

const FREQUENCY_LABELS: Record<SerializedMonthDetail["incomes"][number]["frequency"], string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  one_off: "Pontual",
};

export interface MonthDetailDrawerProps {
  point: SerializedMonthlyDataPoint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthDetailDrawer({ point, open, onOpenChange }: MonthDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />

        <SheetHeader className="gap-1">
          <SheetTitle>{point.monthLabel}</SheetTitle>
          <SheetDescription className="text-[0.75rem] text-[color:var(--text-secondary)]">
            Detalhes do mês.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <KPI
            icon={<TrendingUp size={14} strokeWidth={2} aria-hidden />}
            label="Renda"
            value={point.totalIncome.formatted}
            tone="positive"
          />
          <KPI
            icon={<TrendingDown size={14} strokeWidth={2} aria-hidden />}
            label="Saídas"
            value={point.totalDebtPayments.formatted}
            tone="negative"
          />
          <KPI
            icon={<Wallet size={14} strokeWidth={2} aria-hidden />}
            label="Saldo livre"
            value={point.freeBalance.formatted}
            tone={BigInt(point.freeBalance.cents) >= 0n ? "positive" : "negative"}
          />
        </div>

        {open ? <MonthDetailBody monthIso={point.monthIso} /> : null}

        <div className="mt-5 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-4 backdrop-blur-md">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Patrimônio no fim do mês
          </div>
          <div
            className={`mt-1 text-[1.25rem] font-extrabold ${
              BigInt(point.netWorth.cents) < 0n
                ? "text-[color:var(--semantic-negative)]"
                : "text-[color:var(--semantic-positive)]"
            }`}
          >
            <HideableValue>{point.netWorth.formatted}</HideableValue>
          </div>
          <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
            Ativos <HideableValue>{point.assetsTotal.formatted}</HideableValue> menos dívidas{" "}
            <HideableValue>{point.debtsBalance.formatted}</HideableValue>.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function KPI({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "positive" | "negative" | "brand";
}) {
  const color =
    tone === "positive"
      ? "var(--semantic-positive)"
      : tone === "negative"
        ? "var(--semantic-negative)"
        : "var(--color-brand-800)";
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-3 backdrop-blur-md">
      <div className="flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className="text-[0.8125rem] font-bold" style={{ color }}>
        <HideableValue>{value}</HideableValue>
      </div>
    </div>
  );
}

function MonthDetailBody({ monthIso }: { monthIso: string }) {
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.monthDetail(monthIso),
    queryFn: () => fetchMonthDetail({ monthIso }),
    staleTime: 60 * 60 * 1000,
  });

  if (!data) {
    return (
      <p className="mt-5 text-[0.75rem] text-[color:var(--text-muted)]">
        Não foi possível carregar os detalhes deste mês.
      </p>
    );
  }

  return (
    <>
      <section className="mt-5">
        <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Pagamentos ({data.payments.length})
        </h3>
        {data.payments.length === 0 ? (
          <p className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-4 py-3 text-[0.75rem] text-[color:var(--text-secondary)]">
            Nenhum pagamento registrado neste mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.payments.map((p) => (
              <li key={p.id}>
                <Link href={`/app/dividas/${p.debtId}` as Route} className="block hover:opacity-80">
                  <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3 backdrop-blur-xl">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--semantic-negative)]/[0.12] text-[color:var(--semantic-negative)]">
                      <TrendingDown size={16} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                        {p.debtLabel}
                      </div>
                      <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                        Pago em {p.paidAtLabel}
                      </div>
                    </div>
                    <span className="text-[0.8125rem] font-bold text-[color:var(--semantic-negative)]">
                      <HideableValue>{p.amount.formatted}</HideableValue>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Renda ativa ({data.incomes.length})
        </h3>
        {data.incomes.length === 0 ? (
          <p className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-4 py-3 text-[0.75rem] text-[color:var(--text-secondary)]">
            Nenhuma fonte de renda ativa neste mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.incomes.map((inc) => {
              const Icon =
                inc.frequency === "monthly"
                  ? Calendar
                  : inc.frequency === "weekly"
                    ? Repeat
                    : TrendingUp;
              return (
                <li key={inc.id}>
                  <Link href={"/app/renda" as Route} className="block hover:opacity-80">
                    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3 backdrop-blur-xl">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--semantic-positive)]/[0.12] text-[color:var(--semantic-positive)]">
                        <Icon size={16} strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                          {inc.label}
                        </div>
                        <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                          {FREQUENCY_LABELS[inc.frequency]}
                        </div>
                      </div>
                      <span className="text-[0.8125rem] font-bold text-[color:var(--semantic-positive)]">
                        <HideableValue>{inc.amount.formatted}</HideableValue>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

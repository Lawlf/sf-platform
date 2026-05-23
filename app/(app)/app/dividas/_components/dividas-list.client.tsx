"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Banknote, ChevronRight, CreditCard, Home, Repeat, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { DebtKind } from "@/domain/entities/debt.entity";

import { fetchDebts, type DebtStatusFilter } from "../../_actions/debt-queries";
import { queryKeys } from "../../_lib/query-keys";

const KIND_LABEL: Record<DebtKind, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo ou crediário",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
  recurring: "Compromisso recorrente",
};

const KIND_ICON: Record<DebtKind, typeof Home> = {
  financing: Home,
  personal_loan: Banknote,
  credit_card: CreditCard,
  overdraft: Wallet,
  recurring: Repeat,
};

const FREQUENCY_LABEL = {
  monthly: "mês",
  weekly: "semana",
  annual: "ano",
} as const;

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  paid_off: "Quitada",
  written_off: "Baixada",
};

interface StatusTone {
  bg: string;
  text: string;
}

const DEFAULT_STATUS_TONE: StatusTone = {
  bg: "var(--color-brand-500)/[0.14]",
  text: "var(--color-brand-800)",
};

const STATUS_TONE: Record<string, StatusTone> = {
  active: { bg: "var(--color-brand-500)/[0.14]", text: "var(--color-brand-800)" },
  paid_off: { bg: "var(--semantic-positive)/[0.14]", text: "var(--semantic-positive)" },
  written_off: { bg: "var(--surface-3)", text: "var(--text-muted)" },
};

export function DividasListClient({ statusFilter }: { statusFilter: DebtStatusFilter }) {
  const { data: debts } = useSuspenseQuery({
    queryKey: queryKeys.debts(statusFilter),
    queryFn: () => fetchDebts({ status: statusFilter }),
  });

  if (debts.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Wallet size={22} strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <h3 className="text-base font-bold text-[color:var(--text-primary)]">
            Nenhuma dívida {statusFilter === "active" ? "ativa" : "encontrada"}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Cadastre uma nova pra acompanhar saldo, parcelas e simular cenários.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {debts.map((d) => {
        const Icon = KIND_ICON[d.kind] ?? Wallet;
        const tone: StatusTone = STATUS_TONE[d.status] ?? DEFAULT_STATUS_TONE;
        const amountText =
          d.kind === "recurring" && d.recurringAmount && d.recurringFrequency
            ? `${d.recurringAmount.formatted} / ${FREQUENCY_LABEL[d.recurringFrequency]}`
            : d.status === "active"
              ? d.currentBalance.formatted
              : d.originalPrincipal.formatted;
        return (
          <Link
            key={d.id}
            href={`/app/dividas/${d.id}` as Route}
            className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                  {d.label}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide"
                  style={{
                    background: `color-mix(in srgb, ${tone.text} 14%, transparent)`,
                    color: tone.text,
                  }}
                >
                  {STATUS_LABEL[d.status]}
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2 text-[0.75rem]">
                <span className="text-[color:var(--text-muted)]">
                  {KIND_LABEL[d.kind] ?? d.kind}
                </span>
                <span className="text-[color:var(--text-muted)]">·</span>
                <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
                  {amountText}
                </span>
              </div>
            </div>
            <ChevronRight
              size={16}
              strokeWidth={2}
              className="text-[color:var(--color-brand-800)]"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}

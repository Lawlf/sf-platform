"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import type { ExpenseCategory } from "@/domain/entities/debt.entity";

import {
  fetchMonthDetail,
  type SerializedExpenseRow,
  type SerializedIncomeRow,
  type SerializedPaymentRow,
} from "../_actions/timeline-month-detail";
import { queryKeys } from "../_lib/query-keys";

import { HideableValue } from "./money-visibility/hideable-value.client";
import { ResultLine } from "./movement-card";

const FREQUENCY_LABELS: Record<
  SerializedIncomeRow["frequency"] | "annual",
  string
> = {
  monthly: "Mensal",
  weekly: "Semanal",
  one_off: "Pontual",
  annual: "Anual",
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: "Moradia",
  utilities: "Contas",
  food: "Alimentação",
  transport: "Transporte",
  health: "Saúde",
  leisure: "Lazer",
  subscriptions: "Assinaturas",
  education: "Educação",
  other: "Outros",
};

function sumCents(items: Array<{ amount: { cents: string } }>): bigint {
  return items.reduce((acc, it) => acc + BigInt(it.amount.cents), 0n);
}

function formatBrl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  const fmt = reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${negative ? "-" : ""}${fmt}`;
}

export interface MovementDrawerProps {
  monthIso: string;
  monthLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovementDrawer({ monthIso, monthLabel, open, onOpenChange }: MovementDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />

        <SheetHeader className="gap-1">
          <SheetTitle>Movimento de {monthLabel}</SheetTitle>
          <SheetDescription className="text-[0.75rem] text-[color:var(--text-secondary)]">
            Quanto entrou, quanto saiu, quanto sobrou.
          </SheetDescription>
        </SheetHeader>

        {open ? <MovementBody monthIso={monthIso} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function MovementBody({ monthIso }: { monthIso: string }) {
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

  const incomesTotalCents = sumCents(data.incomes);
  const expensesTotalCents = sumCents(data.expenses);
  const paymentsTotalCents = sumCents(data.payments);
  const freeBalanceCents = incomesTotalCents - expensesTotalCents - paymentsTotalCents;

  return (
    <div className="mt-4">
      <ResultLine
        head="Saldo livre"
        sub="Renda menos despesas menos parcelas"
        value={formatBrl(freeBalanceCents)}
        tone={freeBalanceCents < 0n ? "negative" : "positive"}
      />

      <SectionLabel label="Entradas" totalFormatted={formatBrl(incomesTotalCents)} />
      {data.incomes.length === 0 ? (
        <EmptyRow text="Nenhuma fonte de renda ativa neste mês." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {data.incomes.map((inc) => (
            <IncomeRow key={inc.id} row={inc} />
          ))}
        </ul>
      )}

      <SectionLabel label="Saídas - Despesas" totalFormatted={formatBrl(expensesTotalCents)} />
      {data.expenses.length === 0 ? (
        <EmptyRow text="Nenhuma despesa ativa neste mês." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {data.expenses.map((exp) => (
            <ExpenseRow key={exp.id} row={exp} />
          ))}
        </ul>
      )}

      <SectionLabel label="Saídas - Parcelas" totalFormatted={formatBrl(paymentsTotalCents)} />
      {data.payments.length === 0 ? (
        <EmptyRow text="Nenhum pagamento registrado neste mês." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {data.payments.map((p) => (
            <PaymentRow key={p.id} row={p} monthLabel={data.monthLabel} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionLabel({ label, totalFormatted }: { label: string; totalFormatted: string }) {
  return (
    <div className="mb-2 mt-5 flex items-baseline justify-between px-1">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--text-muted)]">
        {label}
      </span>
      <span className="text-[0.75rem] font-extrabold text-[color:var(--text-primary)]">
        <HideableValue>{totalFormatted}</HideableValue>
      </span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-4 py-3 text-[0.75rem] text-[color:var(--text-secondary)]">
      {text}
    </p>
  );
}

function IncomeRow({ row }: { row: SerializedIncomeRow }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
          {row.label}
        </span>
        <span className="mt-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
          {FREQUENCY_LABELS[row.frequency]}
        </span>
      </div>
      <span className="text-[0.8125rem] font-extrabold text-[color:var(--semantic-positive)]">
        +<HideableValue>{row.amount.formatted}</HideableValue>
      </span>
    </li>
  );
}

function ExpenseRow({ row }: { row: SerializedExpenseRow }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5">
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[color:var(--color-brand-500)]/[0.12] px-2 py-[2px] text-[0.625rem] font-bold text-[color:var(--color-brand-800)]">
            {CATEGORY_LABELS[row.category]}
          </span>
          <span className="truncate text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
            {row.label}
          </span>
        </span>
        <span className="mt-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
          {FREQUENCY_LABELS[row.frequency]}
        </span>
      </div>
      <span className="text-[0.8125rem] font-extrabold text-[color:var(--semantic-negative)]">
        −<HideableValue>{row.amount.formatted}</HideableValue>
      </span>
    </li>
  );
}

function PaymentRow({ row, monthLabel }: { row: SerializedPaymentRow; monthLabel: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
          {row.debtLabel}
        </span>
        <span className="mt-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
          Pagamento de {monthLabel}
        </span>
      </div>
      <span className="text-[0.8125rem] font-extrabold text-[color:var(--semantic-negative)]">
        −<HideableValue>{row.amount.formatted}</HideableValue>
      </span>
    </li>
  );
}

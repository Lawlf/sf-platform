"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarOff } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { OutOfMonthSummary } from "../_actions/debt-queries";
import { fetchMonthDetail, type SerializedMonthDetail } from "../_actions/timeline-month-detail";

import { CommitmentCard } from "./commitment-card";
import { HideableValue } from "./money-visibility/hideable-value.client";

interface Props {
  monthIso: string;
  initialData: SerializedMonthDetail | null;
  hasDebt: boolean;
  outOfMonth: OutOfMonthSummary;
}

// Âncora factual: as dívidas fora do mês não pesam no comprometido, mas
// continuam no total que se deve. Sem comemorar a queda, sem cobrar.
function OutOfMonthAnchor({ summary }: { summary: OutOfMonthSummary }) {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3.5 py-3">
      <span className="mt-0.5 shrink-0 text-[color:var(--text-muted)]">
        <CalendarOff size={16} strokeWidth={2} aria-hidden />
      </span>
      <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
        Você tem <HideableValue>{summary.total.formatted}</HideableValue> em dívida fora do seu mês.
        Não entra no que já tem dono este mês, mas continua no total que você deve.
      </p>
    </div>
  );
}

export function CommitmentSectionClient({ monthIso, initialData, hasDebt, outOfMonth }: Props) {
  const { data: monthDetail } = useSuspenseQuery({
    queryKey: ["timeline", "monthDetail", monthIso],
    queryFn: () => fetchMonthDetail({ monthIso }),
    initialData,
  });

  const hasOutOfMonth = outOfMonth.count > 0;

  // Sem nenhuma dívida ativa. Se houver dívida fora do mês, ancora o total que
  // se deve (senão a home venderia alívio falso). Senão, convite honesto.
  if (!hasDebt) {
    if (hasOutOfMonth) {
      return (
        <section
          aria-label="Renda comprometida"
          className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[18px] backdrop-blur-xl"
        >
          <p className="font-semibold">Nenhuma dívida pesando no seu mês agora.</p>
          <OutOfMonthAnchor summary={outOfMonth} />
        </section>
      );
    }
    return (
      <section
        aria-label="Renda comprometida"
        className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[18px] backdrop-blur-xl"
      >
        <p className="font-semibold">Quanto da sua renda já está comprometida?</p>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Tem cartão, empréstimo ou financiamento? Cadastre para ver quanto da sua renda já está
          comprometida.
        </p>
        <Link
          href={"/app/dividas/nova" as Route}
          className="mt-3 inline-flex items-center rounded-xl bg-[color:var(--color-brand-500)] px-4 py-2 text-sm font-semibold text-white"
        >
          Cadastrar dívida
        </Link>
      </section>
    );
  }

  if (!monthDetail) return null;

  return (
    <div>
      <CommitmentCard pct={monthDetail.totals.committedPct} />
      {hasOutOfMonth ? <OutOfMonthAnchor summary={outOfMonth} /> : null}
    </div>
  );
}

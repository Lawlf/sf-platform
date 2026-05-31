"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import { fetchMonthDetail, type SerializedMonthDetail } from "../_actions/timeline-month-detail";

import { CommitmentCard } from "./commitment-card";

interface Props {
  monthIso: string;
  initialData: SerializedMonthDetail | null;
  hasDebt: boolean;
}

export function CommitmentSectionClient({ monthIso, initialData, hasDebt }: Props) {
  const { data: monthDetail } = useSuspenseQuery({
    queryKey: ["timeline", "monthDetail", monthIso],
    queryFn: () => fetchMonthDetail({ monthIso }),
    initialData,
  });

  // Sem nenhuma dívida, "0% comprometido" significaria "sem dado", não "saudável".
  // Mostra um convite honesto para cadastrar, em vez de uma porcentagem falsa.
  if (!hasDebt) {
    return (
      <section
        aria-label="Renda comprometida"
        className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[18px] backdrop-blur-xl"
      >
        <p className="font-semibold">Quanto da sua renda já tem dono?</p>
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

  const incomeCents = monthDetail.incomes.reduce((a, i) => a + BigInt(i.amount.cents), 0n);
  const outflowCents =
    monthDetail.expenses.reduce((a, e) => a + BigInt(e.amount.cents), 0n) +
    monthDetail.payments.reduce((a, p) => a + BigInt(p.amount.cents), 0n);

  const pct = incomeCents > 0n ? Number(outflowCents) / Number(incomeCents) : 0;

  return <CommitmentCard pct={pct} />;
}

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";

import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { fetchMonthDetail, type SerializedMonthDetail } from "../_actions/timeline-month-detail";

import { HowItWorksSheet } from "./how-it-works-sheet";

function formatBrl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  const fmt = reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${negative ? "-" : ""}${fmt}`;
}

type HealthStatus = "Excelente" | "Saudável" | "Atenção" | "Crítico";

interface HealthInfo {
  label: HealthStatus;
  dotClass: string;
}

function computeHealth(committedPct: number): HealthInfo {
  if (committedPct < 15) {
    return { label: "Excelente", dotClass: "bg-[color:var(--semantic-positive)]" };
  }
  if (committedPct < 30) {
    return { label: "Saudável", dotClass: "bg-[color:var(--semantic-positive)]" };
  }
  if (committedPct < 50) {
    return { label: "Atenção", dotClass: "bg-[color:var(--semantic-warning)]" };
  }
  return { label: "Crítico", dotClass: "bg-[color:var(--semantic-negative)]" };
}

interface Props {
  monthIso: string;
  initialData: SerializedMonthDetail | null;
}

export function DashboardHeroClient({ monthIso, initialData }: Props) {
  const month = useMemo(() => MonthYear.fromIso(monthIso), [monthIso]);
  const timelineHref = `/app/linha-do-tempo/${monthIso}` as Route;

  const { data: monthDetail } = useSuspenseQuery({
    queryKey: ["timeline", "monthDetail", monthIso],
    queryFn: () => fetchMonthDetail({ monthIso }),
    initialData,
  });

  if (!monthDetail) {
    return (
      <p className="text-sm text-[color:var(--text-secondary)]">
        Cadastre renda e dívidas para ver seu saldo livre.
      </p>
    );
  }

  const incomeCents = monthDetail.incomes.reduce((a, i) => a + BigInt(i.amount.cents), 0n);
  const outflowCents =
    monthDetail.expenses.reduce((a, e) => a + BigInt(e.amount.cents), 0n) +
    monthDetail.payments.reduce((a, p) => a + BigInt(p.amount.cents), 0n);
  const freeBalanceCents = incomeCents - outflowCents;

  const saldoFormatted = formatBrl(freeBalanceCents);
  const committedPct = incomeCents > 0n ? (Number(outflowCents) / Number(incomeCents)) * 100 : 0;
  const hasHealth = incomeCents > 0n;
  const health = hasHealth ? computeHealth(committedPct) : null;

  return (
    <div className="relative">
      <Link
        href={timelineHref}
        aria-label={`Ver detalhes de ${month.format()}. Saldo livre ${saldoFormatted}.`}
        className="focus-ring relative flex min-h-[126px] w-full items-center overflow-hidden rounded-2xl border border-[color:var(--color-brand-500)]/20 bg-[linear-gradient(135deg,#d96813_0%,#c25d15_55%,#ba5717_100%)] px-5 py-5 text-left shadow-[0_12px_28px_rgba(239,122,26,0.28)] transition-[filter] hover:brightness-105 md:min-h-[148px] md:px-6 md:py-6"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.20),transparent_70%)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(40,18,0,0.22),transparent_75%)]"
        />
        <div className="relative flex w-full items-center justify-between gap-3">
          <div className="flex-1">
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white">
              Saldo livre do mês
            </span>
            <div className="mt-1.5 text-[1.875rem] font-extrabold leading-none text-white md:text-[2.25rem]">
              {saldoFormatted}
            </div>
            {health ? (
              <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[0.6875rem] font-bold text-white backdrop-blur">
                <span className={`h-2 w-2 rounded-full ${health.dotClass}`} aria-hidden />
                {health.label}
              </span>
            ) : null}
          </div>
          <ChevronRight
            size={22}
            strokeWidth={2.25}
            className="shrink-0 text-white/85"
            aria-hidden
          />
        </div>
      </Link>
      <div className="pointer-events-none absolute right-3 top-3 z-10 text-white md:right-4 md:top-4">
        <div className="pointer-events-auto">
          <HowItWorksSheet topic="saldo-livre" variant="chip" />
        </div>
      </div>
    </div>
  );
}

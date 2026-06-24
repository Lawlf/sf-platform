"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { fetchMonthDetail } from "../_actions/timeline-month-detail";
import { daysUntilNextMonth, nextMonthFloorCents } from "../_lib/month-close";

import { HideableValue } from "./money-visibility/hideable-value.client";

function formatBrl(cents: bigint): string {
  const reais = Number(cents < 0n ? -cents : cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function NextMonthBridge({ currentMonthIso }: { currentMonthIso: string }) {
  const nextMonth = MonthYear.fromIso(currentMonthIso).next();
  const nextIso = nextMonth.toIso();
  const nextName = capitalize(
    new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(nextMonth.toDate()),
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const days = daysUntilNextMonth(currentMonthIso, todayIso);
  const whenLabel = days <= 1 ? "começa amanhã" : `começa em ${days} dias`;

  const { data } = useQuery({
    queryKey: ["timeline", "monthDetail", nextIso],
    queryFn: () => fetchMonthDetail({ monthIso: nextIso }),
  });

  if (!data) return null;

  const floorCents = nextMonthFloorCents(data);
  const positive = floorCents >= 0n;
  const floorFmt = formatBrl(floorCents);
  const href = `/app/linha-do-tempo/${nextIso}` as Route;

  return (
    <Link
      href={href}
      className="focus-ring flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
    >
      <div className="min-w-0">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
          {nextName} {whenLabel}
        </span>
        <span className="mt-1 block text-[0.8125rem] font-semibold leading-snug text-[color:var(--text-secondary)]">
          {positive ? "Por enquanto sobra " : "Por enquanto faltam "}
          <HideableValue>{floorFmt}</HideableValue>. Ainda vai mudar.
        </span>
      </div>
      <ChevronRight
        size={18}
        strokeWidth={2.25}
        className="shrink-0 text-[color:var(--text-muted)]"
        aria-hidden
      />
    </Link>
  );
}

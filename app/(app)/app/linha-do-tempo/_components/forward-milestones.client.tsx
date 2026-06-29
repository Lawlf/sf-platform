"use client";

import { ArrowRight, CalendarCheck, CalendarClock, CalendarX2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import type {
  ForwardMilestone,
  ForwardMilestoneKind,
} from "@/domain/services/forward-milestones.service";

const COLLAPSED = 3;

const PT_BR_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const ICON: Record<ForwardMilestoneKind, LucideIcon> = {
  debt_payoff: CalendarCheck,
  recurring_end: CalendarX2,
  scheduled_charge: CalendarClock,
};

const META: Record<ForwardMilestoneKind, string> = {
  debt_payoff: "Última parcela",
  recurring_end: "Termina",
  scheduled_charge: "Agendado",
};

function monthPill(monthIso: string): string {
  const [year, month] = monthIso.split("-");
  const name = PT_BR_MONTHS[Number(month) - 1] ?? "";
  return `${name}/${year}`;
}

function MilestoneRow({ milestone }: { milestone: ForwardMilestone }) {
  const Icon = ICON[milestone.kind];
  return (
    <Link
      href={milestone.href as Route}
      className="focus-ring flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Icon size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          {milestone.entityLabel}
        </div>
        <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          {META[milestone.kind]}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-2.5 py-0.5 text-[0.6875rem] font-bold capitalize text-[color:var(--text-secondary)]">
          {monthPill(milestone.monthIso)}
        </span>
        <ArrowRight size={14} strokeWidth={2} className="text-[color:var(--text-muted)]" aria-hidden />
      </div>
    </Link>
  );
}

export function ForwardMilestones({ milestones }: { milestones: ForwardMilestone[] }) {
  const [expanded, setExpanded] = useState(false);

  if (milestones.length === 0) return null;

  const shown = expanded ? milestones : milestones.slice(0, COLLAPSED);
  const hiddenCount = milestones.length - shown.length;

  return (
    <section className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Daqui pra frente</h2>
        <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Datas que já estão marcadas.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {shown.map((m) => (
          <MilestoneRow key={m.id} milestone={m} />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="focus-ring w-fit px-1 py-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] hover:underline"
          >
            Ver tudo ({milestones.length})
          </button>
        ) : null}
      </div>
    </section>
  );
}

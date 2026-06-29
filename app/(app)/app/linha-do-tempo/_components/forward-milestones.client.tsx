"use client";

import { ArrowRight, CalendarCheck, CalendarClock, CalendarX2, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import type {
  ForwardMilestone,
  ForwardMilestoneKind,
} from "@/domain/services/forward-milestones.service";

const FACTS_COLLAPSED = 3;

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
  goal_complete: Target,
};

const META: Record<ForwardMilestoneKind, string> = {
  debt_payoff: "Última parcela",
  recurring_end: "Termina",
  scheduled_charge: "Agendado",
  goal_complete: "no ritmo atual",
};

function monthPill(monthIso: string): string {
  const [year, month] = monthIso.split("-");
  const idx = Number(month) - 1;
  const name = PT_BR_MONTHS[idx] ?? "";
  return `${name}/${year}`;
}

function MilestoneRow({ milestone }: { milestone: ForwardMilestone }) {
  const Icon = ICON[milestone.kind];
  const projected = milestone.group === "projection";
  const pillClass = projected
    ? "border border-dashed border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
    : "border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]";
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
        <span
          className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold capitalize ${pillClass}`}
        >
          {monthPill(milestone.monthIso)}
        </span>
        <ArrowRight size={14} strokeWidth={2} className="text-[color:var(--text-muted)]" aria-hidden />
      </div>
    </Link>
  );
}

function GroupHeader({ children }: { children: string }) {
  return (
    <div className="px-1 text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
      {children}
    </div>
  );
}

export function ForwardMilestones({ milestones }: { milestones: ForwardMilestone[] }) {
  const [expanded, setExpanded] = useState(false);
  const facts = milestones.filter((m) => m.group === "fact");
  const projections = milestones.filter((m) => m.group === "projection");

  if (facts.length === 0) return null;

  const shownFacts = expanded ? facts : facts.slice(0, FACTS_COLLAPSED);
  const hiddenCount = facts.length - shownFacts.length;

  return (
    <section className="flex flex-col gap-3 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl md:p-5">
      <div>
        <div className="text-[0.6875rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
          Daqui pra frente
        </div>
        <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Compromissos e metas com data prevista.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <GroupHeader>Datas marcadas</GroupHeader>
        {shownFacts.map((m) => (
          <MilestoneRow key={m.id} milestone={m} />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="focus-ring w-fit px-1 py-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] hover:underline"
          >
            Ver tudo ({facts.length})
          </button>
        ) : null}
      </div>

      {projections.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-dashed border-[color:var(--border-soft)] pt-3">
          <GroupHeader>Se o ritmo continuar</GroupHeader>
          {projections.map((m) => (
            <MilestoneRow key={m.id} milestone={m} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

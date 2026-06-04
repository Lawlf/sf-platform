"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Receipt, SlidersHorizontal, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

import {
  fetchPlanningProjection,
  type PlanningProjectionPayload,
} from "../../_actions/planning-queries";
import { ProjectionCurve } from "../../_components/projection-curve";

import { CascadeConfigPanel } from "./cascade-config-panel.client";

interface Props {
  initialData: PlanningProjectionPayload | null;
}

function EmptyState() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Target size={28} strokeWidth={1.5} aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-bold text-[color:var(--text-primary)]">
          Seu patrimônio no ritmo atual
        </h3>
        <p className="mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">
          A projeção aparece quando você tem renda livre no mês ou uma meta definida.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href={"/app/metas/nova" as Route}
          className="focus-ring inline-flex items-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2.5 text-[0.8125rem] font-bold text-white shadow-[0_4px_12px_rgba(239,122,26,0.25)] transition hover:brightness-105"
        >
          Definir uma meta
        </Link>
        <Link
          href={"/app/renda/nova" as Route}
          className="focus-ring inline-flex items-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)] backdrop-blur transition-colors hover:bg-[color:var(--surface-1)]"
        >
          Adicionar renda
        </Link>
      </div>
    </section>
  );
}

export function TimelineProjection({ initialData }: Props) {
  const { data } = useSuspenseQuery({
    queryKey: ["planning", "projection"],
    queryFn: fetchPlanningProjection,
    initialData,
  });

  if (!data || !data.hasSignal) {
    return <EmptyState />;
  }

  const datedGoals = data.goals.filter((g) => g.etaLabel !== null);

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--color-brand-800)]">
        No ritmo atual
      </span>
      <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
        Se você mantiver o saldo livre atual.
      </p>

      <div className="mt-3">
        <ProjectionCurve points={data.points} />
      </div>

      {datedGoals.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {datedGoals.map((goal) => (
            <li
              key={goal.goalId}
              className="flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-secondary)]"
            >
              <Target
                size={15}
                strokeWidth={2}
                className="shrink-0 text-[color:var(--color-brand-800)]"
                aria-hidden
              />
              <span>
                <span className="font-semibold text-[color:var(--text-primary)]">{goal.title}</span>
                {", no ritmo atual, em "}
                <span className="font-semibold text-[color:var(--color-brand-800)]">
                  {goal.etaLabel}
                </span>
                .
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 border-t border-[color:var(--border-soft)] pt-3">
        <Link
          href={"/app/linha-do-tempo/relatorio" as Route}
          className="focus-ring -mx-1 mb-2 flex items-center gap-2 rounded-lg px-1 py-1.5 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
        >
          <Receipt
            size={15}
            strokeWidth={2}
            className="shrink-0 text-[color:var(--color-brand-800)]"
            aria-hidden
          />
          <span className="flex-1">Relatório do ano</span>
          <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
        </Link>

        <Sheet>
          <SheetTrigger className="focus-ring inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]">
            <SlidersHorizontal size={14} strokeWidth={2} aria-hidden />
            Ajustar
          </SheetTrigger>
          <SheetContent side="bottom" className="overflow-y-auto">
            <SheetHeader className="mb-5">
              <SheetTitle>Ajustar a projeção</SheetTitle>
              <SheetDescription>
                Defina onde seu saldo livre rende e a ordem das suas metas.
              </SheetDescription>
            </SheetHeader>
            <CascadeConfigPanel />
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}

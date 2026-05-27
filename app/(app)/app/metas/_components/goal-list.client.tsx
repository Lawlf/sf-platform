"use client";

import { Crown, PlusCircle, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { SerializedGoalWithProgress } from "../_actions/goal-queries";

import { GoalCard } from "./goal-card";
import { ProLockRow } from "./pro-lock-row";

interface GoalListProps {
  goals: SerializedGoalWithProgress[];
  isPro: boolean;
}

export function GoalList({ goals, isPro }: GoalListProps) {
  const activeGoals = goals.filter((g) => g.goal.status === "active");
  const completedGoals = goals.filter(
    (g) => g.goal.status === "reached" || g.goal.status === "archived",
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={"/app/metas/nova" as Route}
        className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
      >
        <PlusCircle size={16} strokeWidth={2} aria-hidden />
        Nova meta
      </Link>

      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Target size={22} strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">
              Nenhuma meta ainda
            </h3>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Defina onde voce quer chegar e acompanhe seu progresso.
            </p>
          </div>
        </section>
      ) : null}

      {activeGoals.length > 0 ? (
        <div className="flex flex-col gap-2">
          {activeGoals.map((g) => (
            <GoalCard key={g.goal.id} data={g} />
          ))}
        </div>
      ) : null}

      {!isPro ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Mais metas
            </h3>
            <Link
              href={"/app/configuracoes/planos" as Route}
              className="focus-ring inline-flex items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
            >
              Se tornar Pro
              <Crown size={12} strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
          <ProLockRow
            label="Segunda meta"
            subText="Adicione mais objetivos simultaneos no Pro."
          />
          <ProLockRow
            label="Terceira meta"
            subText="Acompanhe todos os seus planos em paralelo."
          />
        </div>
      ) : null}

      {completedGoals.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Concluidas
          </h3>
          {completedGoals.map((g) => (
            <GoalCard key={g.goal.id} data={g} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

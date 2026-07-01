"use client";

import { Crown, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { GoalType } from "@/domain/entities/goal.entity";

import type { SerializedGoalWithProgress } from "../_actions/goal-queries";

import { GoalCard } from "./goal-card";
import { GoalCategorySection } from "./goal-category-section";
import { GoalsHero } from "./goals-hero";
import { ProLockRow } from "./pro-lock-row";

interface GoalListProps {
  goals: SerializedGoalWithProgress[];
  isPro: boolean;
}

const GOAL_TYPE_ORDER: GoalType[] = [
  "debt_payoff",
  "emergency_fund",
  "savings",
  "financial_independence",
];

export function GoalList({ goals, isPro }: GoalListProps) {
  const activeGoals = goals.filter((g) => g.goal.status === "active");
  const reachedGoals = goals.filter((g) => g.goal.status === "reached");
  const archivedGoals = goals.filter((g) => g.goal.status === "archived");

  const goalsWithTarget = activeGoals.filter((g) => Number(g.progress.targetCents) > 0);
  const avgProgressPct =
    goalsWithTarget.length > 0
      ? goalsWithTarget.reduce(
          (sum, g) => sum + Math.min(100, Math.max(0, g.progress.pct)),
          0,
        ) / goalsWithTarget.length
      : null;

  return (
    <div className="flex flex-col gap-4">
      {activeGoals.length === 0 && reachedGoals.length === 0 && archivedGoals.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Target size={22} strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">
              Nenhuma meta ainda
            </h3>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Defina onde você quer chegar e acompanhe seu progresso.
            </p>
          </div>
        </section>
      ) : (
        <GoalsHero
          activeCount={activeGoals.length}
          completedCount={reachedGoals.length}
          avgProgressPct={avgProgressPct}
        />
      )}

      {GOAL_TYPE_ORDER.map((type) => (
        <GoalCategorySection
          key={type}
          type={type}
          goals={activeGoals.filter((g) => g.goal.type === type)}
        />
      ))}

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
              Virar Pro
              <Crown size={12} strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
          <ProLockRow
            label="Segunda meta"
            subText="Adicione mais objetivos simultâneos no Pro."
          />
          <ProLockRow
            label="Terceira meta"
            subText="Acompanhe todos os seus planos em paralelo."
          />
        </div>
      ) : null}

      {reachedGoals.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Concluídas
          </h3>
          {reachedGoals.map((g) => (
            <GoalCard key={g.goal.id} data={g} />
          ))}
        </div>
      ) : null}

      {archivedGoals.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Arquivadas
          </h3>
          {archivedGoals.map((g) => (
            <GoalCard key={g.goal.id} data={g} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

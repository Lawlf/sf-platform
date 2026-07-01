import type { GoalType } from "@/domain/entities/goal.entity";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import type { SerializedGoalWithProgress } from "../_actions/goal-queries";

import { GoalCard, TYPE_LABEL } from "./goal-card";

function brl(cents: string): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface GoalCategorySectionProps {
  type: GoalType;
  goals: SerializedGoalWithProgress[];
}

export function GoalCategorySection({ type, goals }: GoalCategorySectionProps) {
  if (goals.length === 0) return null;

  let totalCents = 0n;
  for (const g of goals) {
    if (BigInt(g.progress.targetCents) > 0n) totalCents += BigInt(g.progress.currentCents);
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          {TYPE_LABEL[type]}
        </h2>
        {totalCents > 0n ? (
          <span className="text-[0.6875rem] font-semibold text-[color:var(--text-secondary)]">
            <HideableValue>{brl(String(totalCents))}</HideableValue>
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {goals.map((g) => (
          <GoalCard key={g.goal.id} data={g} showType={false} />
        ))}
      </div>
    </section>
  );
}

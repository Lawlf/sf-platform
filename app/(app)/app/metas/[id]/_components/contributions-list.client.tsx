"use client";

import { useState } from "react";

import { ResultCard } from "../../../simular/_components/sim-result";
import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";
import type { SerializedGoalContribution } from "../../_actions/goal-queries";

interface ContributionsListProps {
  contributions: SerializedGoalContribution[];
}

function brl(cents: string): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const PREVIEW_COUNT = 5;

export function ContributionsList({ contributions }: ContributionsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (contributions.length === 0) return null;

  const visible = expanded ? contributions : contributions.slice(0, PREVIEW_COUNT);
  const hasMore = contributions.length > PREVIEW_COUNT;

  return (
    <ResultCard title="Últimos aportes" subtitle="O que você guardou nesta meta">
      <ul className="flex flex-col divide-y divide-[color:var(--border-soft)]">
        {visible.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2">
            <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">
              {dayMonth(c.createdAtIso)}
            </span>
            <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
              <HideableValue>{brl(c.amountCents)}</HideableValue>
            </span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="focus-ring mt-1 self-start text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
        >
          {expanded ? "Ver menos" : "Ver todos"}
        </button>
      ) : null}
    </ResultCard>
  );
}

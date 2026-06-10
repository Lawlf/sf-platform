"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import {
  fetchPlanningProjection,
  type PlanningProjectionPayload,
} from "../_actions/planning-queries";

import { HideableValue } from "./money-visibility/hideable-value.client";

interface Props {
  initialData: PlanningProjectionPayload | null;
}

export function HomeProjectionCard({ initialData }: Props) {
  const { data } = useSuspenseQuery({
    queryKey: ["planning", "projection"],
    queryFn: fetchPlanningProjection,
    initialData,
  });

  if (!data || !data.hasSignal || !data.topLine) {
    return null;
  }

  const { topLine } = data;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]">
      <Link
        href={"/app/linha-do-tempo/projecao" as Route}
        aria-label="Ver sua projeção no ritmo atual"
        className="focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <TrendingUp size={18} strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          No ritmo atual, o que é seu cresce{" "}
          <span className="font-semibold text-[color:var(--color-brand-800)]">
            <HideableValue>{topLine.monthlyContributionFormatted}</HideableValue>
          </span>{" "}
          por mês
        </span>
        <ChevronRight
          size={18}
          strokeWidth={2.25}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </Link>
      <Link
        href={"/app/simular/juros-compostos" as Route}
        className="focus-ring flex items-center justify-center border-t border-[color:var(--border-soft)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] transition-colors hover:bg-[color:var(--surface-2)]"
      >
        E se você guardasse mais por mês?
      </Link>
    </div>
  );
}

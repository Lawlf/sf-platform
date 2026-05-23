"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle, Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import {
  fetchMaintenancePrompts,
  type MaintenancePromptPayload,
} from "../_actions/maintenance-queries";
import { queryKeys } from "../_lib/query-keys";
import { markReviewedAction } from "../patrimonio/[id]/_actions/mark-reviewed.action";

import { HowItWorksSheet } from "./how-it-works-sheet";

function daysLabel(days: number): string {
  if (days <= 1) return "há 1 dia";
  if (days < 60) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

interface PromptRowProps {
  assetId: string;
  label: string;
  institution: string | null;
  yieldDescription: string | null;
  lastReviewedAtIso: string | null;
  daysSinceReview: number;
}

function PromptRow({
  assetId,
  label,
  institution,
  yieldDescription,
  lastReviewedAtIso,
  daysSinceReview,
}: PromptRowProps) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onMarkReviewed() {
    setError(null);
    startTransition(async () => {
      const r = await markReviewedAction(assetId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.maintenancePrompts });
      await queryClient.invalidateQueries({ queryKey: queryKeys.netWorth });
      await queryClient.invalidateQueries({ queryKey: queryKeys.assetsWithAllocations });
    });
  }

  const reviewLine = lastReviewedAtIso
    ? `Última revisão ${daysLabel(daysSinceReview)}`
    : `Cadastrada ${daysLabel(daysSinceReview)} sem revisão`;

  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {institution ? (
            <div className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
              {institution}
            </div>
          ) : null}
          <div className="mt-0.5 truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {label}
          </div>
          {yieldDescription ? (
            <div className="mt-0.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              {yieldDescription}
            </div>
          ) : null}
          <div className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">{reviewLine}</div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <SimpleTooltip label="Marcar como revisada" side="top">
            <button
              type="button"
              disabled={pending}
              onClick={onMarkReviewed}
              aria-label={`Marcar ${label} como revisada`}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.14] hover:text-[color:var(--color-brand-800)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle size={16} strokeWidth={2} aria-hidden />
            </button>
          </SimpleTooltip>

          <SimpleTooltip label="Atualizar saldo" side="top">
            <Link
              href={`/app/patrimonio/${assetId}` as Route}
              aria-label={`Atualizar saldo de ${label}`}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.14] hover:text-[color:var(--color-brand-800)]"
            >
              <Pencil size={15} strokeWidth={2} aria-hidden />
            </Link>
          </SimpleTooltip>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[0.6875rem] text-[color:var(--semantic-negative)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface MaintenancePromptsClientProps {
  initialData: MaintenancePromptPayload[];
}

export function MaintenancePromptsClient({ initialData }: MaintenancePromptsClientProps) {
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.maintenancePrompts,
    queryFn: () => fetchMaintenancePrompts(),
    initialData,
  });

  if (!data || data.length === 0) return null;

  return (
    <section aria-label="Reservas que precisam de revisão">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Suas reservas
        </h2>
        <HowItWorksSheet topic="manutencao-reservas" variant="brand" />
      </div>
      <div className="flex flex-col gap-2">
        {data.map((item) => (
          <PromptRow
            key={item.assetId}
            assetId={item.assetId}
            label={item.label}
            institution={item.institution}
            yieldDescription={item.yieldDescription}
            lastReviewedAtIso={item.lastReviewedAtIso}
            daysSinceReview={item.daysSinceReview}
          />
        ))}
      </div>
    </section>
  );
}

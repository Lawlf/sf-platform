"use client";

import { Flame, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import { SimpleTooltip } from "@/app/components/ui/tooltip";


import { TimelineFilterDrawer } from "./timeline-filter-drawer";

export interface TimelineHeroProps {
  patrimonyFormatted: string;
  deltaPct: number | null;
  deltaMonths: number;
  streakCount: number;
  oldestUserDataIso: string | null;
}

function formatRangeLabel(range: string): string {
  if (range === "all") return "Todo o histórico";
  return `${range} meses`;
}

function hasNonDefaultFilters(params: URLSearchParams): boolean {
  const range = params.get("range");
  const show = params.get("show");
  const focus = params.get("focus");
  const q = params.get("q");
  if (range && range !== "all") return true;
  if (show && show !== "all") return true;
  if (focus && focus !== "balance") return true;
  if (q && q.length > 0) return true;
  return false;
}

export function TimelineHero({
  patrimonyFormatted,
  deltaPct,
  deltaMonths,
  streakCount,
  oldestUserDataIso,
}: TimelineHeroProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const params = useSearchParams();
  const range = params.get("range") ?? "all";
  const hasFilters = hasNonDefaultFilters(params);

  const deltaText =
    deltaPct !== null && Number.isFinite(deltaPct)
      ? `${deltaPct > 0 ? "+" : ""}${Math.round(deltaPct)}% em ${deltaMonths} ${deltaMonths === 1 ? "mês" : "meses"}`
      : null;

  return (
    <>
      <header className="sticky top-[58px] z-10 -mx-4 rounded-b-2xl px-4 py-4 backdrop-blur-2xl backdrop-saturate-150 md:-mx-0 md:top-[56px] md:px-0 md:py-5">
        <div
          role="region"
          aria-label="Resumo do patrimônio"
          className="relative rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-5 py-4 backdrop-blur-md"
        >
          <SimpleTooltip label="Buscar e filtrar" side="left">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buscar e filtrar"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="focus-ring absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-secondary)]"
            >
              <Search size={15} strokeWidth={2.25} aria-hidden />
              {hasFilters ? (
                <span
                  aria-hidden
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand-500)] ring-2 ring-[color:var(--surface-1)]"
                />
              ) : null}
            </button>
          </SimpleTooltip>

          <div className="text-[0.625rem] font-bold uppercase tracking-[0.8px] text-[color:var(--text-muted)]">
            Patrimônio líquido
          </div>
          <div className="mt-1 text-[1.75rem] font-extrabold leading-none tracking-[-0.5px] text-[color:var(--text-primary)] md:text-[2rem]">
            <HideableValue>{patrimonyFormatted}</HideableValue>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {deltaText ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--semantic-positive)]/[0.14] px-2 py-1 text-[0.6875rem] font-bold text-[color:var(--semantic-positive)]">
                {deltaText}
              </span>
            ) : null}
            {streakCount >= 2 ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-brand-500)]/[0.12] px-2.5 py-1 text-[0.6875rem] font-bold text-[color:var(--color-brand-800)] ${
                  streakCount >= 3 ? "sf-pulse-soft" : ""
                }`}
              >
                <Flame size={12} strokeWidth={2.25} aria-hidden />
                {streakCount} no verde
              </span>
            ) : null}
            <span className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
              {formatRangeLabel(range)}
            </span>
          </div>
        </div>
      </header>

      <TimelineFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        oldestUserDataIso={oldestUserDataIso}
      />
    </>
  );
}

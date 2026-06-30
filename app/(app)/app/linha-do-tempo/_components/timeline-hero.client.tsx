"use client";

import { Flame, SlidersHorizontal } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";

import { TimelineFilterDrawer } from "./timeline-filter-drawer";

export interface TimelineHeroProps {
  patrimonyFormatted: string;
  monthFreeFormatted: string | null;
  monthFreeCents: string | null;
  deltaPct: number | null;
  deltaMonths: number;
  streakCount: number;
  oldestUserDataIso: string | null;
}

const RANGE_OPTIONS = [
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
  { value: "all", label: "Tudo" },
] as const;

function hasDeepFilters(params: URLSearchParams): boolean {
  const show = params.get("show");
  const focus = params.get("focus");
  const jumpTo = params.get("jumpTo");
  if (show && show !== "all") return true;
  if (focus && focus !== "balance") return true;
  if (jumpTo) return true;
  return false;
}

export function TimelineHero({
  patrimonyFormatted,
  monthFreeFormatted,
  monthFreeCents,
  deltaPct,
  deltaMonths,
  streakCount,
  oldestUserDataIso,
}: TimelineHeroProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const range = params.get("range") ?? "all";
  const deepFilters = hasDeepFilters(params);

  let monthFreePositive = true;
  try {
    monthFreePositive = monthFreeCents === null ? true : BigInt(monthFreeCents) >= 0n;
  } catch {
    monthFreePositive = true;
  }
  const monthFreeAbs = monthFreeFormatted ? monthFreeFormatted.replace("-", "").trim() : null;

  function selectRange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("range");
    else next.set("range", value);
    const query = next.toString();
    const href = (
      query.length > 0 ? `/app/linha-do-tempo?${query}` : "/app/linha-do-tempo"
    ) as Route;
    startTransition(() => {
      router.push(href);
    });
  }

  const deltaText =
    deltaPct !== null && Number.isFinite(deltaPct)
      ? `${deltaPct > 0 ? "+" : ""}${Math.round(deltaPct)}% em ${deltaMonths} ${deltaMonths === 1 ? "mês" : "meses"}`
      : null;

  return (
    <>
      <header className="sticky top-[58px] z-10 -mx-4 rounded-b-2xl px-4 py-4 md:-mx-0 md:top-[48px] md:px-0 md:py-5">
        <div
          role="region"
          aria-label="Resumo do mês"
          className="relative rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-5 py-4 backdrop-blur-md"
        >
          {monthFreeAbs ? (
            <>
              <div className="text-[0.625rem] font-bold uppercase tracking-[0.8px] text-[color:var(--text-muted)]">
                {monthFreePositive ? "Sobra do mês" : "Falta do mês"}
              </div>
              <div className="mt-1 text-[1.75rem] font-extrabold leading-none tracking-[-0.5px] text-[color:var(--text-primary)] md:text-[2rem]">
                <HideableValue>{monthFreeAbs}</HideableValue>
              </div>
              <div className="mt-1.5 text-[0.8125rem] text-[color:var(--text-muted)]">
                Patrimônio: <HideableValue>{patrimonyFormatted}</HideableValue>
              </div>
            </>
          ) : (
            <>
              <div className="text-[0.625rem] font-bold uppercase tracking-[0.8px] text-[color:var(--text-muted)]">
                Patrimônio
              </div>
              <div className="mt-1 text-[1.75rem] font-extrabold leading-none tracking-[-0.5px] text-[color:var(--text-primary)] md:text-[2rem]">
                <HideableValue>{patrimonyFormatted}</HideableValue>
              </div>
            </>
          )}

          {deltaText || streakCount >= 2 ? (
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
                  {streakCount} meses com sobra
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Período"
              className={`flex flex-wrap gap-2 ${pending ? "opacity-60" : ""}`}
            >
              {RANGE_OPTIONS.map((opt) => {
                const active = range === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectRange(opt.value)}
                    aria-pressed={active}
                    className={`focus-ring inline-flex items-center rounded-full px-3 py-1.5 text-[0.75rem] font-bold transition-colors ${
                      active
                        ? "border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
                        : "border border-transparent bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="focus-ring relative ml-auto inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[0.75rem] font-bold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]"
            >
              <SlidersHorizontal size={13} strokeWidth={2.25} aria-hidden />
              Ver de outro jeito
              {deepFilters ? (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[color:var(--color-brand-500)] ring-2 ring-[color:var(--surface-1)]"
                />
              ) : null}
            </button>
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

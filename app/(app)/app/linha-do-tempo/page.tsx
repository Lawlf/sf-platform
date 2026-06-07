import { ChevronRight, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchTimelinePage } from "../_actions/timeline-queries";
import { PageShell } from "../_components/page-shell";

import { TimelineContent } from "./_components/timeline-content.client";
import { TimelineHero } from "./_components/timeline-hero.client";
import { TimelineSkeleton } from "./_components/timeline-skeleton";

export const metadata: Metadata = { title: "Linha do tempo" };

interface PageProps {
  searchParams: Promise<{
    range?: string;
    show?: string;
    focus?: string;
    jumpTo?: string;
  }>;
}

const INITIAL_PAGE_LIMIT = 6;

type TimelineRange = "3" | "6" | "12" | "24" | "all";
type TimelineShow = "all" | "highlights" | "with-payments";

function parseRange(value: string | undefined): TimelineRange {
  if (value === "3" || value === "6" || value === "12" || value === "24" || value === "all") {
    return value;
  }
  return "all";
}

function parseShow(value: string | undefined): TimelineShow {
  if (value === "all" || value === "highlights" || value === "with-payments") {
    return value;
  }
  return "all";
}

function nowMonthIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function computeStreakCount(
  pointsMostRecentFirst: ReadonlyArray<{ freeBalance: { cents: string } }>,
): number {
  let streak = 0;
  for (const p of pointsMostRecentFirst) {
    let cents: bigint;
    try {
      cents = BigInt(p.freeBalance.cents);
    } catch {
      break;
    }
    if (cents > 0n) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export default async function LinhaDoTempoPage({ searchParams }: PageProps) {
  await requireUser();
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const show = parseShow(sp.show);

  const initialPage = await fetchTimelinePage({
    beforeIso: nowMonthIso(),
    limit: INITIAL_PAGE_LIMIT,
    range,
    show,
  });

  const firstPoint = initialPage?.points?.[0] ?? null;
  const patrimonyFormatted = firstPoint?.netWorth.formatted ?? "R$ 0,00";
  const streakCount = initialPage ? computeStreakCount(initialPage.points) : 0;
  const oldestUserDataIso = initialPage?.oldestUserDataIso ?? null;

  return (
    <PageShell title="Linha do tempo" description="Sua trajetória financeira mês a mês.">
      <TimelineHero
        patrimonyFormatted={patrimonyFormatted}
        deltaPct={null}
        deltaMonths={0}
        streakCount={streakCount}
        oldestUserDataIso={oldestUserDataIso}
      />
      <Link
        href={"/app/linha-do-tempo/projecao" as Route}
        className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <TrendingUp size={18} strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          Projeção futura
        </span>
        <ChevronRight
          size={18}
          strokeWidth={2.25}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </Link>
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineContent />
      </Suspense>
    </PageShell>
  );
}

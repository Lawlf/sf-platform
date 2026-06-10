import type { Metadata } from "next";
import { Suspense } from "react";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchPlanningProjection } from "../_actions/planning-queries";
import { fetchTimelinePage } from "../_actions/timeline-queries";
import { PageShell } from "../_components/page-shell";

import {
  PatrimonyTrajectoryChart,
  type TrajectoryPoint,
} from "./_components/patrimony-trajectory-chart.client";
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

  const trajectoryPage = await fetchTimelinePage({
    beforeIso: nowMonthIso(),
    limit: 12,
    range,
  });
  const trajectoryPoints: TrajectoryPoint[] = trajectoryPage
    ? [...trajectoryPage.points]
        .reverse()
        .map((p) => ({
          monthIso: p.monthIso,
          netWorthCents: p.netWorth.cents,
          debtsCents: p.debtsBalance.cents,
        }))
    : [];

  const projectionInitial = await fetchPlanningProjection();

  return (
    <PageShell title="Linha do tempo" description="Sua trajetória financeira mês a mês.">
      <TimelineHero
        patrimonyFormatted={patrimonyFormatted}
        deltaPct={null}
        deltaMonths={0}
        streakCount={streakCount}
        oldestUserDataIso={oldestUserDataIso}
      />
      <PatrimonyTrajectoryChart points={trajectoryPoints} projectionInitial={projectionInitial} />
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineContent />
      </Suspense>
    </PageShell>
  );
}

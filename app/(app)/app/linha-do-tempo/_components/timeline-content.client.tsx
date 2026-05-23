"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import {
  fetchTimelinePage,
  type SerializedMonthlyDataPoint,
  type SerializedStoryCard,
  type SerializedTimelinePage,
} from "../../_actions/timeline-queries";
import { queryKeys } from "../../_lib/query-keys";

import { MonthSection, type TimelineFocus } from "./month-section";
import { StoryCard } from "./story-card";
import { TimelineEmptyState } from "./timeline-empty-state";
import { TimelineSkeleton } from "./timeline-skeleton";

const PAGE_LIMIT = 6;

type TimelineRange = "3" | "6" | "12" | "24" | "all";
type TimelineShow = "all" | "highlights" | "with-payments";

function nowMonthIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isValidFocus(value: string | null): value is TimelineFocus {
  return value === "balance" || value === "networth" || value === "income";
}

function isValidRange(value: string | null): value is TimelineRange {
  return value === "3" || value === "6" || value === "12" || value === "24" || value === "all";
}

function isValidShow(value: string | null): value is TimelineShow {
  return value === "all" || value === "highlights" || value === "with-payments";
}

interface TimelineItem {
  kind: "month" | "story";
  monthPoint?: SerializedMonthlyDataPoint;
  previousPoint?: SerializedMonthlyDataPoint | null;
  isCurrent?: boolean;
  isFeatured?: boolean;
  story?: SerializedStoryCard;
  key: string;
}

function buildItems(pages: SerializedTimelinePage[], query: string): TimelineItem[] {
  const points: SerializedMonthlyDataPoint[] = [];
  const stories: SerializedStoryCard[] = [];
  for (const page of pages) {
    if (!page) continue;
    for (const p of page.points) points.push(p);
    for (const s of page.stories) stories.push(s);
  }

  // points come most-recent-first; ensure unique + sorted desc.
  const seenMonths = new Set<string>();
  const pointsDesc = points
    .filter((p) => {
      if (seenMonths.has(p.monthIso)) return false;
      seenMonths.add(p.monthIso);
      return true;
    })
    .sort((a, b) => (a.monthIso > b.monthIso ? -1 : a.monthIso < b.monthIso ? 1 : 0));

  // stories unique by (kind + monthIso).
  const seenStories = new Set<string>();
  const storiesAll = stories.filter((s) => {
    const key = `${s.kind}-${s.monthIso}`;
    if (seenStories.has(key)) return false;
    seenStories.add(key);
    return true;
  });

  // Best month across loaded pages (max freeBalance.cents).
  let bestMonthIso: string | null = null;
  let bestCents = -Infinity;
  for (const p of pointsDesc) {
    let c: number;
    try {
      c = Number(BigInt(p.freeBalance.cents));
    } catch {
      continue;
    }
    if (Number.isFinite(c) && c > bestCents) {
      bestCents = c;
      bestMonthIso = p.monthIso;
    }
  }

  const q = query.trim().toLowerCase();
  const matchedPoints = q
    ? pointsDesc.filter(
        (p) => p.monthLabel.toLowerCase().includes(q) || p.monthIso.toLowerCase().includes(q),
      )
    : pointsDesc;
  const matchedStories = q
    ? storiesAll.filter(
        (s) => s.eyebrow.toLowerCase().includes(q) || s.line.toLowerCase().includes(q),
      )
    : storiesAll;

  const items: TimelineItem[] = [];
  for (let i = 0; i < matchedPoints.length; i++) {
    const current = matchedPoints[i]!;
    const olderInList = matchedPoints[i + 1] ?? null;

    items.push({
      kind: "month",
      key: `month-${current.monthIso}`,
      monthPoint: current,
      previousPoint: olderInList,
      isCurrent: i === 0 && !q,
      isFeatured: bestMonthIso === current.monthIso && !q,
    });

    if (olderInList) {
      // Stories whose monthIso lives strictly between current and the next older month.
      // Visually these appear right under the current month section and above the older one.
      const between = matchedStories.filter(
        (s) => s.monthIso > olderInList.monthIso && s.monthIso < current.monthIso,
      );
      between.forEach((s, idx) => {
        items.push({
          kind: "story",
          key: `story-${s.kind}-${s.monthIso}-${idx}`,
          story: s,
        });
      });
    }
  }
  return items;
}

export function TimelineContent() {
  const params = useSearchParams();
  const range: TimelineRange = isValidRange(params.get("range"))
    ? (params.get("range") as TimelineRange)
    : "all";
  const show: TimelineShow = isValidShow(params.get("show"))
    ? (params.get("show") as TimelineShow)
    : "all";
  const focus: TimelineFocus = isValidFocus(params.get("focus"))
    ? (params.get("focus") as TimelineFocus)
    : "balance";
  const jumpTo = params.get("jumpTo");
  const query = params.get("q") ?? "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
    SerializedTimelinePage | null,
    Error,
    { pages: (SerializedTimelinePage | null)[]; pageParams: (string | null)[] },
    ReturnType<typeof queryKeys.timeline>,
    string | null
  >({
    queryKey: queryKeys.timeline({ range, show }),
    queryFn: ({ pageParam }) => {
      const beforeIso = pageParam ?? nowMonthIso();
      return fetchTimelinePage({
        beforeIso,
        limit: PAGE_LIMIT,
        range,
        show,
      });
    },
    initialPageParam: nowMonthIso() as string | null,
    getNextPageParam: (last) => (last ? last.olderMonthIso : null),
    staleTime: 60 * 60 * 1000,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pages = useMemo(() => data?.pages ?? [], [data?.pages]);

  useEffect(() => {
    if (!jumpTo) return;
    if (typeof document === "undefined") return;
    const el = document.getElementById(`month-${jumpTo}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [jumpTo, pages]);

  const items = useMemo(
    () =>
      buildItems(
        pages.filter((p): p is SerializedTimelinePage => Boolean(p)),
        query,
      ),
    [pages, query],
  );

  // First page null means unauthenticated; render nothing.
  const firstPage = pages[0];
  if (pages.length > 0 && firstPage === null) {
    return null;
  }

  if (items.length === 0 && !isFetchingNextPage && !hasNextPage) {
    return <TimelineEmptyState />;
  }

  return (
    <div className="flex flex-col gap-3 pb-12">
      {items.map((item) => {
        if (item.kind === "story" && item.story) {
          return <StoryCard key={item.key} story={item.story} />;
        }
        if (item.kind === "month" && item.monthPoint) {
          return (
            <MonthSection
              key={item.key}
              point={item.monthPoint}
              previousPoint={item.previousPoint ?? null}
              focus={focus}
              isCurrent={item.isCurrent ?? false}
              isFeatured={item.isFeatured ?? false}
            />
          );
        }
        return null;
      })}

      <div ref={sentinelRef} aria-hidden />

      {isFetchingNextPage ? (
        <div className="py-2">
          <TimelineSkeleton />
        </div>
      ) : null}

      {!hasNextPage && items.length > 0 ? (
        <p className="py-6 text-center text-[0.75rem] text-[color:var(--text-muted)]">
          Você chegou ao início do seu histórico.
        </p>
      ) : null}
    </div>
  );
}

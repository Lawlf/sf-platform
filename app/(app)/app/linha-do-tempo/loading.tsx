import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "../_components/page-shell";

import { TimelineSkeleton } from "./_components/timeline-skeleton";

export default function Loading() {
  return (
    <PageShell title="Linha do tempo" description="Sua trajetória financeira mês a mês.">
      <header className="sticky top-[58px] z-10 -mx-4 rounded-b-2xl px-4 py-4 md:-mx-0 md:top-[56px] md:px-0 md:py-5">
        <div className="relative rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-5 py-4 backdrop-blur-md">
          <Skeleton className="h-3 w-32 rounded-md" />
          <Skeleton className="mt-2 h-8 w-48 rounded-md md:h-9 md:w-56" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </header>
      <TimelineSkeleton />
    </PageShell>
  );
}

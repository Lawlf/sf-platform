import type { Metadata } from "next";
import type { Route } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchPlanningProjection } from "../../_actions/planning-queries";
import { PageShell } from "../../_components/page-shell";
import { TimelineProjection } from "../_components/timeline-projection.client";

export const metadata: Metadata = { title: "No ritmo atual" };

export default async function ProjecaoPage() {
  await requireUser();
  const projectionInitial = await fetchPlanningProjection();

  return (
    <PageShell
      title="No ritmo atual"
      description="Seu patrimônio e suas metas no ritmo atual."
      backHref={"/app/linha-do-tempo" as Route}
    >
      <Suspense fallback={<Skeleton className="h-[260px] rounded-2xl" />}>
        <TimelineProjection initialData={projectionInitial} />
      </Suspense>
    </PageShell>
  );
}

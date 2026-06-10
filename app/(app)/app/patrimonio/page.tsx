import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchAssetsWithAllocations, fetchNetWorth } from "../_actions/asset-queries";
import { PageShell } from "../_components/page-shell";
import { getServerQueryClient } from "../_lib/query-client.server";
import { queryKeys } from "../_lib/query-keys";

import { PatrimonioContentClient } from "./_components/patrimonio-content.client";

export default async function PatrimonioPage() {
  await requireUser();

  const queryClient = getServerQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: queryKeys.netWorth, queryFn: () => fetchNetWorth() }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.assetsWithAllocations,
      queryFn: () => fetchAssetsWithAllocations(),
    }),
  ]);

  return (
    <PageShell title="Patrimônio" description="Veja o que você tem, o que deve e o que sobra.">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<PatrimonyContentSkeleton />}>
          <PatrimonioContentClient />
        </Suspense>
      </HydrationBoundary>
    </PageShell>
  );
}

function PatrimonyContentSkeleton() {
  return (
    <>
      <Skeleton className="h-[148px] rounded-[var(--radius-card)]" />
      <Skeleton className="h-10 w-40 rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-[76px] rounded-2xl" />
          <Skeleton className="h-[76px] rounded-2xl" />
        </section>
      ))}
    </>
  );
}

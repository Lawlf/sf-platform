import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Calculator, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchAssetsWithAllocations, fetchNetWorth } from "../_actions/asset-queries";
import { HowItWorksSheet } from "../_components/how-it-works-sheet";
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
    <PageShell
      title="Patrimônio"
      description="Veja o que você tem, o que deve e o que sobra."
      headerAction={
        <div className="flex items-center gap-2">
          <HowItWorksSheet
            topic="patrimonio"
            variant="brand"
            actions={[
              {
                icon: <Calculator size={18} strokeWidth={2} aria-hidden />,
                label: "Simular quanto isso pode render",
                href: "/app/simular" as Route,
              },
            ]}
          />
          <Link
            href={"/app/patrimonio/novo" as Route}
            className="focus-ring flex items-center gap-1.5 rounded-xl bg-[color:var(--color-brand-500)] px-3.5 py-2 text-[0.8125rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.3)] transition-colors hover:bg-[color:var(--color-brand-600)]"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            Novo
          </Link>
        </div>
      }
    >
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

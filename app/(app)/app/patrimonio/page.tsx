import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";

import { PatrimonioContentClient } from "./_components/patrimonio-content.client";

export default async function PatrimonioPage() {
  await requireUser();

  return (
    <PageShell title="Patrimônio" description="Acompanhe seus ativos e patrimônio líquido.">
      <Suspense fallback={<PatrimonyContentSkeleton />}>
        <PatrimonioContentClient />
      </Suspense>
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

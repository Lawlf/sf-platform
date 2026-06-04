import type { Metadata } from "next";
import type { Route } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchAnnualReport } from "../../_actions/planning-queries";
import { PageShell } from "../../_components/page-shell";
import { AnnualReport } from "../_components/annual-report.client";

export const metadata: Metadata = { title: "Relatório do ano" };

export default async function RelatorioPage() {
  await requireUser();
  const reportInitial = await fetchAnnualReport();

  return (
    <PageShell
      title="Relatório do ano"
      description="Pra onde seu dinheiro foi neste ano."
      backHref={"/app/linha-do-tempo" as Route}
    >
      <Suspense fallback={<Skeleton className="h-[320px] rounded-2xl" />}>
        <AnnualReport initialData={reportInitial} />
      </Suspense>
    </PageShell>
  );
}

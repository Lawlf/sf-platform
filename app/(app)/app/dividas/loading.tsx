import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "../_components/page-shell";

export default function Loading() {
  return (
    <PageShell title="Dívidas" description="Acompanhe e simule a quitação das suas dívidas.">
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-2xl" />
        ))}
      </div>
    </PageShell>
  );
}

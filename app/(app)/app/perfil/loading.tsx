import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "../_components/page-shell";

export default function Loading() {
  return (
    <PageShell title="Perfil" description="Quem você é, como anda sua saúde financeira.">
      <Skeleton className="h-[108px] rounded-[var(--radius-card)]" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-[100px] rounded-2xl" />
        <Skeleton className="h-[100px] rounded-2xl" />
        <Skeleton className="h-[100px] rounded-2xl" />
      </div>
      <section>
        <Skeleton className="mb-2 h-3 w-20 rounded-md" />
        <div className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-3 h-3 w-64 rounded-md" />
      </section>
    </PageShell>
  );
}

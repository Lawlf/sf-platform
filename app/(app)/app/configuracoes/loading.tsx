import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "../_components/page-shell";

const SECTION_ITEM_COUNTS = [1, 2, 2, 1, 2];

export default function Loading() {
  return (
    <PageShell title="Configurações" description="Ajuste a plataforma do seu jeito.">
      <Skeleton className="h-[80px] rounded-2xl" />
      {SECTION_ITEM_COUNTS.map((count, sectionIdx) => (
        <section key={sectionIdx} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24 rounded-md" />
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </section>
      ))}
      <Skeleton className="mt-4 h-[48px] rounded-2xl" />
    </PageShell>
  );
}

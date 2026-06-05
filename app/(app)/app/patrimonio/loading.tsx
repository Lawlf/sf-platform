import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "../_components/page-shell";

export default function Loading() {
  return (
    <PageShell title="Patrimônio" description="Veja o que você tem, o que deve e o que sobra.">
      <Skeleton className="h-[148px] rounded-[var(--radius-card)]" />
      <Skeleton className="h-10 w-40 rounded-xl" />
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <section key={sectionIdx} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-[76px] rounded-2xl" />
          <Skeleton className="h-[76px] rounded-2xl" />
        </section>
      ))}
    </PageShell>
  );
}

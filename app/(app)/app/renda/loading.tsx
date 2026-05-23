import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "../_components/page-shell";

export default function Loading() {
  return (
    <PageShell title="Renda" description="Salário, dividendos, freelances. Suas fontes de renda.">
      <Skeleton className="h-[46px] w-full rounded-xl" />
      <section className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20 rounded-md" />
        <div className="grid gap-2 md:grid-cols-2">
          <Skeleton className="h-[76px] rounded-2xl" />
          <Skeleton className="h-[76px] rounded-2xl" />
        </div>
      </section>
    </PageShell>
  );
}

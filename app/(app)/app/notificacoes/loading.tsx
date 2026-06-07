import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "../_components/page-shell";

export default function Loading() {
  return (
    <PageShell title="Notificações" description="O que mudou nas suas contas, dívidas e metas.">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[80px] rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[72px] rounded-2xl" />
          <Skeleton className="h-[72px] rounded-2xl" />
          <Skeleton className="h-[72px] rounded-2xl" />
        </div>
      </div>
    </PageShell>
  );
}

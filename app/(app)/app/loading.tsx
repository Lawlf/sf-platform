import { Skeleton } from "@/app/components/ui/skeleton";

import { PageShell } from "./_components/page-shell";

export default function Loading() {
  return (
    <PageShell
      title={<Skeleton className="h-8 w-56 rounded-lg md:h-9 md:w-72" />}
      description={<Skeleton className="h-4 w-44 rounded-md" />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Skeleton className="h-[160px] rounded-2xl" />
        </div>

        <div className="md:col-span-2">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[72px] rounded-[14px] sm:h-[96px]" />
            <Skeleton className="h-[72px] rounded-[14px] sm:h-[96px]" />
            <Skeleton className="h-[72px] rounded-[14px] sm:h-[96px]" />
          </div>
        </div>

        <div className="md:col-span-2">
          <Skeleton className="mb-2 h-3 w-32 rounded-md" />
          <Skeleton className="h-[180px] rounded-[18px]" />
        </div>

        <div className="md:col-span-2">
          <Skeleton className="mb-2 h-3 w-16 rounded-md" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[72px] rounded-2xl" />
            <Skeleton className="h-[72px] rounded-2xl" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

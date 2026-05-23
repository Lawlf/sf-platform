import { Skeleton } from "@/app/components/ui/skeleton";

export function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <section key={i} className="flex flex-col gap-2">
          <header className="flex items-center justify-between px-1">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </header>
          <Skeleton className="h-[176px] rounded-2xl" />
        </section>
      ))}
    </div>
  );
}

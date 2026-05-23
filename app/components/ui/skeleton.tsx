import { cn } from "@/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("sf-skeleton relative overflow-hidden rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };

import { cn } from "@/lib/utils";

interface FilterSkeletonProps {
  selects: number;
  className?: string;
}

export function FilterSkeleton({ selects, className }: FilterSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end animate-pulse", className)}>
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-16 rounded bg-gray-200" />
        <div className="h-9 rounded-lg bg-gray-100" />
      </div>
      {Array.from({ length: selects }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-4 w-12 rounded bg-gray-200" />
          <div className="h-9 w-28 rounded-lg bg-gray-100" />
        </div>
      ))}
      <div className="h-9 w-20 rounded-lg bg-gray-100" />
    </div>
  );
}

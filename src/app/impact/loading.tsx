import { cn } from "@/lib/utils";
import { ImpactHero } from "./ImpactHero";

export default function ImpactLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">Loading impact figures…</span>
      <ImpactHero />

      <section className="border-y border-gray-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Collective effort, measured
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <StatCardSkeleton key={i} className="bg-gray-50" />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-4 pt-14 pb-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">
            Recent activity
          </h2>
          <div className="mx-auto mb-8 mt-3 h-4 w-40 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <StatCardSkeleton key={i} className="bg-white" />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            Top areas
          </h2>
          <div className="animate-pulse space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl border border-gray-100 bg-white" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCardSkeleton({ className }: { className: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl border border-gray-100 p-6", className)}>
      <div className="mx-auto mb-3 h-6 w-6 rounded-full bg-gray-200" />
      <div className="mx-auto h-8 w-20 rounded bg-gray-200" />
      <div className="mx-auto mt-2 h-4 w-24 rounded bg-gray-100" />
    </div>
  );
}

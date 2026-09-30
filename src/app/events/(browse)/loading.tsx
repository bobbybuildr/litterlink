import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { FilterSkeleton } from "@/components/FilterSkeleton";

export default function EventsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only" role="status">Loading events…</span>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litter picks near you</h1>
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
        <Link
          href="/events/create"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
        >
          <CalendarPlus className="h-4 w-4" /> Create event
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
        <FilterSkeleton selects={3} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="order-1 lg:order-2 h-105 animate-pulse rounded-xl border border-gray-200 bg-gray-100 shadow-sm" />
        <div className="order-2 lg:order-1 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-l-4 border-gray-200 bg-white p-3 shadow-sm">
      <div className="h-5 w-2/3 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-full rounded bg-gray-100" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-40 rounded bg-gray-100" />
        <div className="h-3 w-52 rounded bg-gray-100" />
        <div className="h-3 w-24 rounded bg-gray-100" />
      </div>
      <div className="mt-4 h-6 w-20 rounded-lg bg-gray-100" />
    </div>
  );
}

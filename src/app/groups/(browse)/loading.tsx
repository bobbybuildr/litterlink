import Link from "next/link";
import { UsersRound } from "lucide-react";
import { FilterSkeleton } from "@/components/FilterSkeleton";

export default function GroupsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only" role="status">Loading groups…</span>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups near you</h1>
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-gray-200" />
        </div>
        <Link
          href="/groups/create"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark transition-colors"
        >
          <UsersRound className="h-4 w-4" /> Create group
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
        <FilterSkeleton selects={2} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="order-2 lg:order-1 hidden h-105 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm lg:block" />
        <div className="order-1 lg:order-2 h-105 animate-pulse rounded-xl border border-gray-200 bg-gray-100 shadow-sm" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex animate-pulse items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="h-11 w-11 shrink-0 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded-full bg-gray-100" />
              <div className="h-5 w-2/3 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

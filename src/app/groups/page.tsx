import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GroupCard } from "@/components/groups/GroupCard";
import { FeaturedGroupCard } from "@/components/groups/FeaturedGroupCard";
import { GroupsFilter } from "@/components/groups/GroupsFilter";
import { GroupsMap } from "@/components/map/GroupsMap";
import { getPublishedGroups, getFeaturedGroup, haversineKm } from "@/lib/events";
import { geocodePostcode } from "@/lib/geocode";

export const metadata: Metadata = {
  title: "Browse Groups",
  description:
    "Find and join local litter-picking groups and communities across the UK.",
};

const PAGE_SIZE = 6;

interface Props {
  searchParams: Promise<{ postcode?: string; radius?: string; type?: string; page?: string }>;
}

export default async function GroupsPage({ searchParams }: Props) {
  const { postcode, radius, type, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const radiusKm = radius ? parseInt(radius, 10) : 16; // default 10 mi

  // Geocode the search postcode server-side
  let geo: { latitude: number; longitude: number } | null = null;
  if (postcode) {
    geo = await geocodePostcode(postcode);
  }

  const allGroups = await getPublishedGroups();

  // Groups matching the type filter — used for the map (always shows all matching pins)
  const mapGroups = type ? allGroups.filter((g) => g.group_type === type) : allGroups;

  // List is further filtered by postcode radius
  let groups = mapGroups;
  if (geo) {
    groups = groups.filter(
      (g) =>
        g.latitude != null &&
        g.longitude != null &&
        haversineKm(geo!.latitude, geo!.longitude, g.latitude, g.longitude) <= radiusKm
    );
  }

  // Only showcase the featured group when no search/filter has been applied
  const hasSearch = Boolean(postcode || type);
  const featuredGroup = hasSearch ? null : getFeaturedGroup(allGroups);

  // Exclude the featured group from the regular list so it isn't shown twice
  const listGroups = featuredGroup
    ? groups.filter((g) => g.id !== featuredGroup.id)
    : groups;

  const totalPages = Math.max(1, Math.ceil(listGroups.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedGroups = listGroups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (postcode) params.set("postcode", postcode);
    if (radius) params.set("radius", radius);
    if (type) params.set("type", type);
    if (safePage > 1) params.set("page", String(safePage));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "1") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/groups?${qs}` : "/groups";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups near you</h1>
          <p className="mt-1 text-sm text-gray-500">
            {groups.length} group{groups.length !== 1 ? "s" : ""}
            {postcode ? ` near ${postcode}` : " across the UK"}
          </p>
          {(postcode || type) && (
            <Link
              href={buildUrl({ postcode: undefined, radius: undefined, type: undefined, page: "1" })}
              className="mt-0.5 text-xs text-brand hover:underline"
            >
              Show all groups across the UK
            </Link>
          )}
        </div>
        <Link
          href="/groups/create"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
        >
          <UsersRound className="h-4 w-4" /> Create group
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
        <Suspense fallback={<FilterSkeleton />}>
          <GroupsFilter />
        </Suspense>
      </div>

      {postcode && !geo && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Postcode &ldquo;{postcode}&rdquo; wasn&apos;t recognised. Showing all groups.
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-6", featuredGroup && "lg:grid-cols-2")}>
        {/* Featured group */}
        {featuredGroup && (
          <div className="order-2 lg:order-1">
            <FeaturedGroupCard group={featuredGroup} className="h-full" />
          </div>
        )}

        {/* Map */}
        <div
          className={cn(
            "order-1 h-105 overflow-hidden rounded-xl border border-gray-200 shadow-sm",
            featuredGroup && "lg:order-2"
          )}
        >
          <GroupsMap
            groups={mapGroups}
            centerLat={geo?.latitude}
            centerLng={geo?.longitude}
            radiusKm={geo ? radiusKm : undefined}
          />
        </div>
      </div>

      {/* Group list */}
      <div className="mt-6 flex flex-col gap-4">
        {listGroups.length === 0 ? (
          <EmptyState postcode={postcode} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pagedGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <Link
                  href={buildUrl({ page: String(safePage - 1) })}
                  aria-disabled={safePage <= 1}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors",
                    safePage <= 1
                      ? "pointer-events-none text-gray-300"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
                <span className="text-sm text-gray-500">
                  Page {safePage} of {totalPages}
                </span>
                <Link
                  href={buildUrl({ page: String(safePage + 1) })}
                  aria-disabled={safePage >= totalPages}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors",
                    safePage >= totalPages
                      ? "pointer-events-none text-gray-300"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ postcode }: { postcode?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <p className="text-2xl">🤝</p>
      <p className="mt-2 font-semibold text-gray-700">No groups found</p>
      <p className="mt-1 text-sm text-gray-500">
        {postcode
          ? `No groups found near ${postcode}.`
          : "No groups found for this type yet."}
      </p>
      <Link
        href="/groups/create"
        className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
      >
        Be the first — create one
      </Link>
    </div>
  );
}

function FilterSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-16 rounded bg-gray-200" />
        <div className="h-9 rounded-lg bg-gray-100" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-4 w-12 rounded bg-gray-200" />
          <div className="h-9 w-28 rounded-lg bg-gray-100" />
        </div>
      ))}
      <div className="h-9 w-20 rounded-lg bg-gray-100" />
    </div>
  );
}

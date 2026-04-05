import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventCard } from "@/components/events/EventCard";
import { EventsFilter } from "@/components/events/EventsFilter";
import { EventsMap } from "@/components/map/EventsMap";
import { getPublishedEvents } from "@/lib/events";
import { geocodePostcode } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Browse Events",
  description:
    "Find local litter-picking events near you across the UK. Filter by postcode and join in.",
};

const PAGE_SIZE = 5;

interface Props {
  searchParams: Promise<{ postcode?: string; radius?: string; from?: string; to?: string; page?: string; pastPage?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const { postcode, radius, from, to, page, pastPage } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const currentPastPage = Math.max(1, parseInt(pastPage ?? "1", 10));
  const radiusKm = radius ? parseInt(radius, 10) : 16; // default 10 mi

  // Geocode the search postcode server-side
  let geo: { latitude: number; longitude: number } | null = null;
  if (postcode) {
    geo = await geocodePostcode(postcode);
  }

  // If no search postcode, try to center the map on the user's profile postcode
  let profileGeo: { latitude: number; longitude: number } | null = null;
  if (!geo) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("postcode")
        .eq("id", user.id)
        .single();
      if (profile?.postcode) {
        profileGeo = await geocodePostcode(profile.postcode);
      }
    }
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);
  const defaultTo = sevenDaysLater.toISOString().split("T")[0];

  const fromDate = from ?? today;
  const toDate = to ?? defaultTo;

  const events = await getPublishedEvents(
    geo
      ? { lat: geo.latitude, lng: geo.longitude, radiusKm, from: fromDate, to: toDate }
      : { from: fromDate, to: toDate }
  );

  const upcomingEvents = events.filter(
    (e) => new Date(e.starts_at) >= now && e.status !== "completed"
  );
  const pastEvents = events.filter(
    (e) => new Date(e.starts_at) < now || e.status === "completed"
  );

  const totalPages = Math.max(1, Math.ceil(upcomingEvents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedUpcomingEvents = upcomingEvents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const pastTotalPages = Math.max(1, Math.ceil(pastEvents.length / PAGE_SIZE));
  const safePastPage = Math.min(currentPastPage, pastTotalPages);
  const pagedPastEvents = pastEvents.slice(
    (safePastPage - 1) * PAGE_SIZE,
    safePastPage * PAGE_SIZE
  );

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (postcode) params.set("postcode", postcode);
    if (radius) params.set("radius", radius);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (safePage > 1) params.set("page", String(safePage));
    if (safePastPage > 1) params.set("pastPage", String(safePastPage));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "1") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/events?${qs}` : "/events";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litter picks near you</h1>
          <p className="mt-1 text-sm text-gray-500">
            {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""}
            {postcode ? ` near ${postcode}` : " across the UK"}
            {pastEvents.length > 0 && (
              <span className="text-gray-400"> · {pastEvents.length} past</span>
            )}
          </p>
        </div>
        <Link
          href="/events/create"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
        >
        <CalendarPlus className="h-4 w-4" /> Create event
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Suspense>
          <EventsFilter defaultFrom={fromDate} defaultTo={toDate} />
        </Suspense>
      </div>

      {postcode && !geo && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Postcode &ldquo;{postcode}&rdquo; wasn&apos;t recognised. Showing all events.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Map */}
        <div className="order-1 lg:order-2 h-105 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <EventsMap
            events={events}
            centerLat={geo?.latitude ?? profileGeo?.latitude}
            centerLng={geo?.longitude ?? profileGeo?.longitude}
          />
        </div>

        {/* Event list */}
        <div className="order-2 lg:order-1 flex flex-col gap-4">
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <EmptyState postcode={postcode} />
          ) : (
            <>
              {upcomingEvents.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No upcoming picks{postcode ? ` near ${postcode}` : ""} in this date range.
                  </p>
                </div>
              )}
              {pagedUpcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
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
              {pastEvents.length > 0 && (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                    <svg
                      className="h-4 w-4 shrink-0 rotate-0 transition-transform group-open:rotate-90"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Show {pastEvents.length} past event{pastEvents.length !== 1 ? "s" : ""}
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    {pagedPastEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                    {pastTotalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                        <Link
                          href={buildUrl({ pastPage: String(safePastPage - 1) })}
                          aria-disabled={safePastPage <= 1}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors",
                            safePastPage <= 1
                              ? "pointer-events-none text-gray-300"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </Link>
                        <span className="text-sm text-gray-500">
                          Page {safePastPage} of {pastTotalPages}
                        </span>
                        <Link
                          href={buildUrl({ pastPage: String(safePastPage + 1) })}
                          aria-disabled={safePastPage >= pastTotalPages}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors",
                            safePastPage >= pastTotalPages
                              ? "pointer-events-none text-gray-300"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ postcode }: { postcode?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <p className="text-2xl">🌿</p>
      <p className="mt-2 font-semibold text-gray-700">No events found</p>
      <p className="mt-1 text-sm text-gray-500">
        {postcode
          ? `No picks within this distance of ${postcode}.`
          : " "}
      </p>
      <Link
        href="/events/create"
        className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
      >
        Be the first — create one
      </Link>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="h-full w-full animate-pulse rounded-xl bg-gray-100" />
  );
}

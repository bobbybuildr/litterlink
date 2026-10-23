import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EventsFilter } from "@/components/events/EventsFilter";
import { FilterSkeleton } from "@/components/FilterSkeleton";
import { PaginationLink } from "@/components/PaginationLink";
import { EventsMap } from "@/components/map/EventsMap";
import { getLaterEvents, getPublishedEvents, haversineKm } from "@/lib/events";
import { geocodePostcode } from "@/lib/geocode";
import {
  MAX_EVENT_RANGE_DAYS,
  addDaysToIsoDate,
  formatIsoDate,
  parseEventDateRange,
  parsePage,
  parsePostcode,
  parseRadiusKm,
} from "@/lib/search-params";
import { hasListingParams, pageMetadata } from "@/lib/seo";

const PAGE_SIZE = 5;
const LATER_PAGE_SIZE = 10;
const LISTING_PARAMS = ["postcode", "radius", "from", "to", "page", "pastPage", "laterPage"] as const;

type EventsSearchParams = {
  postcode?: string;
  radius?: string;
  from?: string;
  to?: string;
  page?: string;
  pastPage?: string;
  laterPage?: string;
};

interface Props {
  searchParams: Promise<EventsSearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return pageMetadata({
    title: "Litter Picking Events Near You",
    description:
      "Find local litter-picking events near you across the UK. Filter by postcode and join in.",
    path: "/events",
    indexable: !hasListingParams(await searchParams, LISTING_PARAMS),
  });
}

export default async function EventsPage({ searchParams }: Props) {
  const { postcode: rawPostcode, radius, from, to, page, pastPage, laterPage } = await searchParams;
  const postcode = parsePostcode(rawPostcode) ?? undefined;
  const currentPage = parsePage(page);
  const currentPastPage = parsePage(pastPage);
  const currentLaterPage = parsePage(laterPage);
  const radiusKm = parseRadiusKm(radius);

  // Geocode the search postcode server-side
  let geo: { latitude: number; longitude: number } | null = null;
  if (postcode) {
    geo = await geocodePostcode(postcode);
  }

  const now = new Date();
  const { from: fromDate, to: toDate, clamped: rangeClamped } = parseEventDateRange(from, to, now);

  const hasDateFilter = Boolean(from || to);
  // The "later" list is for the default view only: filtered searches already choose their own range.
  const showLater = !rawPostcode && !hasDateFilter;
  const rangeLabel = hasDateFilter ? "for your chosen date range" : "over the next week";

  const [allEvents, later] = await Promise.all([
    getPublishedEvents({ from: fromDate, to: toDate }),
    showLater
      ? getLaterEvents({
          fromDate: addDaysToIsoDate(toDate, 1),
          page: currentLaterPage,
          pageSize: LATER_PAGE_SIZE,
        })
      : null,
  ]);

  // Filter the list by radius (haversine) — map always shows all pins
  const events = geo
    ? allEvents.filter((e) => haversineKm(geo.latitude, geo.longitude, e.latitude, e.longitude) <= radiusKm)
    : allEvents;

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
    if (radius) params.set("radius", String(radiusKm));
    if (from) params.set("from", fromDate);
    if (to) params.set("to", toDate);
    if (safePage > 1) params.set("page", String(safePage));
    if (safePastPage > 1) params.set("pastPage", String(safePastPage));
    if (later && later.page > 1) params.set("laterPage", String(later.page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "1") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/events?${qs}` : "/events";
  }

  const backHref = buildUrl({});

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litter picks near you</h1>
          <p className="mt-1 text-sm text-gray-500">
            {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""}
            {postcode ? ` near ${postcode} ${rangeLabel}` : ` across the UK ${rangeLabel}`}
            {pastEvents.length > 0 && (
              <span className="text-gray-400"> · {pastEvents.length} past</span>
            )}
          </p>
          {postcode && (
            <Link
              href={buildUrl({ postcode: undefined, radius: undefined, page: "1", pastPage: "1" })}
              className="mt-0.5 text-xs text-brand hover:underline"
            >
              Show all events across the UK
            </Link>
          )}
        </div>
        <Link
          href="/events/create"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
        >
        <CalendarPlus className="h-4 w-4" /> Create event
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
        <Suspense fallback={<FilterSkeleton selects={3} />}>
          <EventsFilter key={`${fromDate}:${toDate}`} defaultFrom={fromDate} defaultTo={toDate} />
        </Suspense>
      </div>

      {rangeClamped && (
        <div role="status" className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Searches can cover up to {MAX_EVENT_RANGE_DAYS} days, so we&apos;re showing events from{" "}
          {formatIsoDate(fromDate)} to {formatIsoDate(toDate)}.
        </div>
      )}

      {rawPostcode && !geo && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          {postcode ? <>Postcode &ldquo;{postcode}&rdquo; wasn&apos;t recognised.</> : <>That postcode wasn&apos;t recognised.</>}{" "}
          Showing all events.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Map */}
        <div className="order-1 lg:order-2 h-105 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <EventsMap
            events={allEvents}
            centerLat={geo?.latitude}
            centerLng={geo?.longitude}
            radiusKm={geo ? radiusKm : undefined}
            filtered={!showLater}
          />
        </div>

        {/* Event list */}
        <div className="order-2 lg:order-1 flex flex-col gap-4">
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <EmptyState postcode={postcode} />
          ) : (
            <>
              <h2 className="sr-only">Upcoming litter picks</h2>
              {upcomingEvents.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No upcoming picks{postcode ? ` near ${postcode}` : ""} in this date range.
                  </p>
                </div>
              )}
              {pagedUpcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} backHref={backHref} />
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <PaginationLink href={buildUrl({ page: String(safePage - 1) })} disabled={safePage <= 1}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </PaginationLink>
                  <span className="text-sm text-gray-500">
                    Page {safePage} of {totalPages}
                  </span>
                  <PaginationLink href={buildUrl({ page: String(safePage + 1) })} disabled={safePage >= totalPages}>
                    Next <ChevronRight className="h-4 w-4" />
                  </PaginationLink>
                </div>
              )}
              {pastEvents.length > 0 && (
                <section aria-labelledby="past-events-heading">
                  <h2 id="past-events-heading" className="sr-only">Past litter picks</h2>
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
                        <EventCard key={event.id} event={event} backHref={backHref} />
                      ))}
                      {pastTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                          <PaginationLink href={buildUrl({ pastPage: String(safePastPage - 1) })} disabled={safePastPage <= 1}>
                            <ChevronLeft className="h-4 w-4" /> Previous
                          </PaginationLink>
                          <span className="text-sm text-gray-500">
                            Page {safePastPage} of {pastTotalPages}
                          </span>
                          <PaginationLink
                            href={buildUrl({ pastPage: String(safePastPage + 1) })}
                            disabled={safePastPage >= pastTotalPages}
                          >
                            Next <ChevronRight className="h-4 w-4" />
                          </PaginationLink>
                        </div>
                      )}
                    </div>
                  </details>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {later && later.total > 0 && (
        <section aria-labelledby="later-events-heading" className="mt-10">
          <h2 id="later-events-heading" className="text-xl font-bold text-gray-900">
            Coming up later
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {later.total} more event{later.total !== 1 ? "s" : ""} after{" "}
            {formatIsoDate(toDate)}.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {later.events.map((event) => (
              <EventCard key={event.id} event={event} backHref={backHref} />
            ))}
          </div>
          {later.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <PaginationLink href={buildUrl({ laterPage: String(later.page - 1) })} disabled={later.page <= 1}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </PaginationLink>
              <span className="text-sm text-gray-500">
                Page {later.page} of {later.totalPages}
              </span>
              <PaginationLink
                href={buildUrl({ laterPage: String(later.page + 1) })}
                disabled={later.page >= later.totalPages}
              >
                Next <ChevronRight className="h-4 w-4" />
              </PaginationLink>
            </div>
          )}
        </section>
      )}
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
          ? `No picks found near ${postcode} in the selected date range.`
          : "No events found in the selected date range."}
      </p>
      {postcode && (
        <p className="mt-0.5 text-sm text-gray-400">
          Try a wider radius or adjusting the dates.
        </p>
      )}
      <Link
        href="/events/create"
        className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
      >
        Be the first — create one
      </Link>
    </div>
  );
}

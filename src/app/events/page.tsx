import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
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

interface Props {
  searchParams: Promise<{ postcode?: string; radius?: string; from?: string; to?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const { postcode, radius, from, to } = await searchParams;
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
          className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
        >
          + Create event
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
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
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
                    {pastEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
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

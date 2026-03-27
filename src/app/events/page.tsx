import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { EventsFilter } from "@/components/events/EventsFilter";
import { EventsMap } from "@/components/map/EventsMap";
import { getPublishedEvents } from "@/lib/events";
import { geocodePostcode } from "@/lib/geocode";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litter picks near you</h1>
          <p className="mt-1 text-sm text-gray-500">
            {events.length} event{events.length !== 1 ? "s" : ""} found
            {postcode ? ` near ${postcode}` : " across the UK"}
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
            centerLat={geo?.latitude}
            centerLng={geo?.longitude}
          />
        </div>

        {/* Event list */}
        <div className="order-2 lg:order-1 flex flex-col gap-4">
          {events.length === 0 ? (
            <EmptyState postcode={postcode} />
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
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
          ? `No upcoming picks within this distance of ${postcode}.`
          : "No upcoming litter picks yet."}
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

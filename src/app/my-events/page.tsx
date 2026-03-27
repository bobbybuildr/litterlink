import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJoinedEvents } from "@/lib/events";
import { EventCard } from "@/components/events/EventCard";
import type { EventWithCount } from "@/lib/events";

export const metadata: Metadata = { title: "Events I've Joined" };

export default async function MyEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/my-events");

  const events = await getJoinedEvents(user.id);

  const now = new Date();
  const upcoming = events.filter(
    (e) => new Date(e.starts_at) >= now && e.status !== "cancelled"
  );
  const past = events.filter(
    (e) => new Date(e.starts_at) < now || e.status === "completed" || e.status === "cancelled"
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events I&apos;ve joined</h1>
          <p className="mt-1 text-sm text-gray-500">
            {events.length} event{events.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/events"
          className="flex w-fit items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
        >
          Browse events
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <EventSection title="Upcoming" events={upcoming} emptyMessage="No upcoming events — why not find one?" emptyHref="/events" />
      <EventSection title="Past" events={past} emptyMessage="You haven't attended any events yet." />
    </div>
  );
}

function EventSection({
  title,
  events,
  emptyMessage,
  emptyHref,
}: {
  title: string;
  events: EventWithCount[];
  emptyMessage: string;
  emptyHref?: string;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {title}
        <span className="ml-2 text-sm font-normal text-gray-400">{events.length}</span>
      </h2>
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
          {emptyHref && (
            <Link
              href={emptyHref}
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              Find events
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </section>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Package, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import type { EventWithCount } from "@/lib/events";

export const metadata: Metadata = { title: "My Events" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/dashboard");

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, postcode")
    .eq("id", user.id)
    .single();

  // Fetch events the user has joined (confirmed only)
  const { data: participations } = await supabase
    .from("event_participants")
    .select("event_id, status, joined_at")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("joined_at", { ascending: false });

  const participatedEventIds = participations?.map((p) => p.event_id) ?? [];

  // Fetch the actual event data for those IDs
  const { data: joinedEventsRaw } = participatedEventIds.length
    ? await supabase
        .from("events_with_counts")
        .select("*")
        .in("id", participatedEventIds)
        .order("starts_at", { ascending: false })
    : { data: [] };

  const joinedEvents = (joinedEventsRaw ?? []) as EventWithCount[];

  // Fetch events the user has organised
  const { data: organisedEventsRaw } = await supabase
    .from("events_with_counts")
    .select("*")
    .eq("organiser_id", user.id)
    .order("starts_at", { ascending: false });

  const organisedEvents = (organisedEventsRaw ?? []) as EventWithCount[];

  // Personal impact totals from completed events
  const completedIds = joinedEvents
    .filter((e) => e.status === "completed")
    .map((e) => e.id);

  const { data: statsRows } = completedIds.length
    ? await supabase
        .from("event_stats")
        .select("bags_collected, weight_kg, actual_attendees")
        .in("event_id", completedIds)
    : { data: [] };

  const totalBags = statsRows?.reduce((s, r) => s + (r.bags_collected ?? 0), 0) ?? 0;
  const totalKg = statsRows?.reduce((s, r) => s + Number(r.weight_kg ?? 0), 0) ?? 0;

  const upcomingJoined = joinedEvents.filter(
    (e) => new Date(e.starts_at) >= new Date() && e.status === "published"
  );
  const pastJoined = joinedEvents.filter(
    (e) => new Date(e.starts_at) < new Date() || e.status === "completed"
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Your litter-picking activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="w-fit rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit profile
          </Link>
          <Link
            href="/events/create"
            className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
          >
            + Create event
          </Link>
        </div>
      </div>

      {/* Impact summary */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ImpactCard
          icon={<Calendar className="h-5 w-5 text-brand" />}
          value={joinedEvents.length}
          label="Events joined"
        />
        <ImpactCard
          icon={<Package className="h-5 w-5 text-brand" />}
          value={totalBags}
          label="Bags collected"
        />
        <ImpactCard
          icon={<Users className="h-5 w-5 text-brand" />}
          value={`${totalKg.toFixed(1)} kg`}
          label="Litter removed"
        />
      </div>

      {/* Upcoming events */}
      <Section
        title="Upcoming picks"
        count={upcomingJoined.length}
        emptyMessage="You haven't joined any upcoming picks yet."
        emptyAction={{ href: "/events", label: "Browse events" }}
      >
        {upcomingJoined.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </Section>

      {/* Organised events */}
      <Section
        title="Events you've organised"
        count={organisedEvents.length}
        emptyMessage="You haven't organised any events yet."
        emptyAction={{ href: "/events/create", label: "Create an event" }}
      >
        {organisedEvents.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </Section>

      {/* Past events */}
      <Section
        title="Past picks"
        count={pastJoined.length}
        emptyMessage="You haven't attended any events yet."
      >
        {pastJoined.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </Section>
    </div>
  );
}

function ImpactCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
  emptyMessage,
  emptyAction,
}: {
  title: string;
  count: number;
  children?: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: { href: string; label: string };
}) {
  return (
    <div className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {title}
        <span className="ml-2 text-sm font-normal text-gray-400">{count}</span>
      </h2>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
          {emptyAction && (
            <Link
              href={emptyAction.href}
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
      )}
    </div>
  );
}

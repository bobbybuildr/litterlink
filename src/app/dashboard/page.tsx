import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Calendar, CalendarPlus, ClipboardList, Trash, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import type { EventWithCount, GroupRow } from "@/lib/events";

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
    .select("display_name, postcode, is_verified_organiser")
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

  // Fetch groups the user has created
  const { data: groupsRaw } = await supabase
    .from("groups")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const groups = (groupsRaw ?? []) as GroupRow[];

  // Personal impact totals from completed events
  const completedIds = joinedEvents
    .filter((e) => e.status === "completed")
    .map((e) => e.id);

  const { data: statsRows } = completedIds.length
    ? await supabase
        .from("event_stats")
        .select("bags_collected, actual_attendees")
        .in("event_id", completedIds)
    : { data: [] };

  const totalBags = statsRows?.reduce((s, r) => s + (r.bags_collected ?? 0), 0) ?? 0;

  const upcomingJoined = joinedEvents.filter(
    (e) => new Date(e.starts_at) >= new Date() && e.status === "published"
  );
  const pastJoined = joinedEvents.filter(
    (e) => new Date(e.starts_at) < new Date() || e.status === "completed"
  );
  const needsWrapUp = organisedEvents.filter(
    (e) => e.status === "published" && new Date(e.starts_at) < new Date()
  );
  const organisedOverview = organisedEvents.filter(
    (e) => !(e.status === "published" && new Date(e.starts_at) < new Date())
  );
  const organisedActive = organisedOverview.filter((e) => e.status !== "completed");
  const organisedCompleted = organisedOverview.filter((e) => e.status === "completed");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
            {profile?.is_verified_organiser && (
              <BadgeCheck className="h-6 w-6 text-brand" aria-label="Verified Organiser" />
            )}
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
          {profile?.is_verified_organiser && (
          <Link
            href="/groups/create"
            className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark transition-colors"
          >
            + Create group
          </Link>)}
        </div>
      </div>

      {/* Organiser status */}
      {profile?.is_verified_organiser ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
          <BadgeCheck className="h-5 w-5 shrink-0 text-brand" />
          <p className="text-sm font-medium text-brand">
            You are a Verified Organiser — you can create verified events and groups.
          </p>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">
            Planning on hosting your own litter picks?
          </p>
          <Link
            href="/become-a-verified-organiser"
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            Become a Verified Organiser
          </Link>
        </div>
      )}

      {/* Impact summary */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ImpactCard
          icon={<Calendar className="h-5 w-5 text-brand" />}
          value={joinedEvents.length}
          label="Events joined"
        />
        <ImpactCard
          icon={<CalendarPlus className="h-5 w-5 text-brand" />}
          value={organisedEvents.length}
          label="Events organised"
        />
        <ImpactCard
          icon={<Trash className="h-5 w-5 text-brand" />}
          value={totalBags}
          label="Bags collected from events you've attended"
        />
      </div>

      {/* Your groups */}
      {profile?.is_verified_organiser && <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Your groups
            <span className="ml-2 text-sm font-normal text-gray-400">{groups.length}</span>
          </h2>
          {profile?.is_verified_organiser && (
            <Link
              href="/groups/create"
              className="text-sm font-medium text-brand hover:underline"
            >
              + New group
            </Link>
          )}
        </div>
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">You haven&apos;t created any groups yet.</p>
            {profile?.is_verified_organiser && (
              <Link
                href="/groups/create"
                className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
              >
                Create a group
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        )}
      </div>}

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

      <Section
        title="Needs wrap-up"
        count={needsWrapUp.length}
        emptyMessage="No completed events are waiting for stats."
      >
        {needsWrapUp.map((e) => (
          <ActionCard
            key={e.id}
            event={e}
            title="Log your impact"
            body="This event has passed. Add attendance and clean-up totals to mark it complete."
            actionHref={`/events/${e.id}/stats`}
            actionLabel="Open stats"
          />
        ))}
      </Section>

      {/* Organised events */}
      <Section
        title="Events you've organised"
        count={organisedCompleted.length}
        totalForEmpty={organisedEvents.length}
        emptyMessage="You haven't organised any events yet."
        emptyAction={{ href: "/events/create", label: "Create an event" }}
        collapsibleCount={organisedCompleted.length}
        collapsibleLabel="completed event"
        collapsibleChildren={
          organisedCompleted.map((e) => (
            <EventCard key={e.id} event={e} />
          ))
        }
      >
        {organisedActive.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </Section>

      {/* Past events */}
      <Section
        title="Past events you've joined"
        count={pastJoined.length}
        emptyMessage="You haven't attended any events yet."
        collapsibleCount={pastJoined.length}
        collapsibleLabel="joined event"
        collapsibleChildren={
          pastJoined.map((e) => (
          <EventCard key={e.id} event={e} />
        ))
      }
      >
      </Section>
    </div>
  );
}

function GroupCard({ group }: { group: GroupRow }) {
  const GROUP_TYPE_LABELS: Record<string, string> = {
    community: "Community",
    school: "School",
    corporate: "Corporate",
    council: "Council",
    charity: "Charity",
    other: "Organisation",
  };
  return (
    <Link
      href={`/groups/${group.slug}`}
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {group.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.logo_url}
          alt={`${group.name} logo`}
          width={44}
          height={44}
          className="shrink-0 rounded-lg object-cover border border-gray-100"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 border border-brand/20">
          <Users className="h-5 w-5 text-brand" />
        </div>
      )}
      <div className="min-w-0">
        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 mb-1">
          {GROUP_TYPE_LABELS[group.group_type] ?? "Organisation"}
        </span>
        <p className="font-semibold text-gray-900 group-hover:text-brand truncate">
          {group.name}
        </p>
        {group.description && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{group.description}</p>
        )}
      </div>
    </Link>
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

function ActionCard({
  event,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  event: EventWithCount;
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">{title}</p>
          <p className="mt-1 text-sm text-amber-800">{body}</p>
        </div>
      </div>

      <EventCard event={event} className="border-amber-200 bg-white shadow-none" />

      <Link
        href={actionHref}
        className="mt-4 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function Section({
  title,
  count,
  totalForEmpty,
  children,
  emptyMessage,
  emptyAction,
  collapsibleCount,
  collapsibleLabel,
  collapsibleChildren,
}: {
  title: string;
  count: number;
  totalForEmpty?: number;
  children?: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: { href: string; label: string };
  collapsibleCount?: number;
  collapsibleLabel?: string;
  collapsibleChildren?: React.ReactNode;
}) {
  const isEmpty = (totalForEmpty ?? count) === 0;
  return (
    <div className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {title}
        <span className="ml-2 text-sm font-normal text-gray-400">{count}</span>
      </h2>
      {isEmpty ? (
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
      {collapsibleCount != null && collapsibleCount > 0 && collapsibleChildren && (
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
            <svg
              className="h-4 w-4 shrink-0 rotate-0 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Show {collapsibleCount} {collapsibleLabel}{collapsibleCount !== 1 ? "s" : ""}
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{collapsibleChildren}</div>
        </details>
      )}
    </div>
  );
}

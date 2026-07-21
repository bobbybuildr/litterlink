import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Globe, Calendar, Clock, Trash, Users, CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import { LatestEventHighlight } from "@/components/events/LatestEventHighlight";
import type { EventWithCount } from "@/lib/events";
import type { Database } from "@/types/database";

type EventStatsRow = Database["public"]["Tables"]["event_stats"]["Row"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: slug } = await params;
  const supabase = await createClient();

  const q = supabase
    .from("profiles")
    .select("display_name, username, bio");
  const { data: profile } = await (
    UUID_RE.test(slug) ? q.eq("id", slug) : q.eq("username", slug)
  ).single();

  if (!profile) {
    return { title: "Profile not found — LitterLink" };
  }

  const name = profile.display_name ?? profile.username ?? "LitterLink member";
  return {
    title: `${name} — LitterLink`,
    description: profile.bio ?? `View ${name}'s profile on LitterLink.`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { id: slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/events"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          ← Back to events
        </Link>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
            <Users className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sign in to view profiles</h1>
          <p className="max-w-sm text-sm text-gray-500">
            Profile pages are only visible to LitterLink members. Sign in or create a free account to continue.
          </p>
          <div className="flex gap-3">
            <Link
              href={`/sign-in?redirectTo=/profile/${slug}`}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Fetch profile — slug may be a UUID or a username
  const q = supabase
    .from("profiles")
    .select("id, display_name, username, bio, avatar_url, social_url, is_verified_organiser, created_at");
  const { data: profile } = await (
    UUID_RE.test(slug) ? q.eq("id", slug) : q.eq("username", slug)
  ).single();

  if (!profile) notFound();

  // Canonical URL: if accessed by UUID and user has a username, redirect to username URL
  if (UUID_RE.test(slug) && profile.username) {
    redirect(`/profile/${profile.username}`);
  }

  const now = new Date().toISOString();

  // Fetch organised events first so we can use their IDs for impact stats
  const { data: organisedEventsRaw } = await supabase
    .from("events_with_counts")
    .select("*")
    .eq("organiser_id", profile.id)
    .in("status", ["published", "completed"])
    .order("starts_at", { ascending: true });

  const organisedEvents = (organisedEventsRaw ?? []) as EventWithCount[];

  // Fetch events joined by this user (confirmed only), excluding cancelled events
  const { data: participations } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("user_id", profile.id)
    .eq("status", "confirmed");

  const participatedEventIds = participations?.map((p) => p.event_id) ?? [];

  const { data: joinedEventsRaw } = participatedEventIds.length
    ? await supabase
        .from("events_with_counts")
        .select("*")
        .in("id", participatedEventIds)
        .neq("status", "cancelled")
    : { data: [] };

  const joinedEvents = (joinedEventsRaw ?? []) as EventWithCount[];
  const completedJoinedEvents = joinedEvents.filter((e) => e.status === "completed");
  const completedOrganisedEvents = organisedEvents.filter((e) => e.status === "completed");

  // Completed events this person joined or organised, deduplicated by id
  const completedEventsById = new Map<string, EventWithCount>();
  for (const e of [...completedJoinedEvents, ...completedOrganisedEvents]) {
    completedEventsById.set(e.id, e);
  }
  const completedIds = Array.from(completedEventsById.keys());

  // Parallel fetches that don't depend on each other
  const [
    { data: attendedStatsRows },
    { data: completedStatsRowsRaw },
    { data: groupMembershipsRaw },
  ] = await Promise.all([
    // Bags collected from completed events they attended
    completedJoinedEvents.length > 0
      ? supabase
          .from("event_stats")
          .select("bags_collected")
          .in("event_id", completedJoinedEvents.map((e) => e.id))
      : Promise.resolve({ data: [] as { bags_collected: number | null }[], error: null }),

    // Full stats for completed events they joined or organised (deduplicated) —
    // used for total duration and the "latest event" highlight below
    completedIds.length > 0
      ? supabase
          .from("event_stats")
          .select("*")
          .in("event_id", completedIds)
      : Promise.resolve({ data: null, error: null }),

    // Groups this person is a member of (with membership role)
    supabase
      .from("group_members")
      .select("role, groups(id, name, slug, description, logo_url, group_type)")
      .eq("user_id", profile.id)
      .order("joined_at", { ascending: false })
      .limit(6),
  ]);

  const completedStatsRows = (completedStatsRowsRaw ?? []) as unknown as EventStatsRow[];

  // Most recent completed event that has stats recorded, for the impact highlight section
  const latestStatsEvent = completedStatsRows
    .map((stats) => ({ stats, event: completedEventsById.get(stats.event_id) }))
    .filter((entry): entry is { stats: EventStatsRow; event: EventWithCount } => !!entry.event)
    .sort((a, b) => new Date(b.event.starts_at).getTime() - new Date(a.event.starts_at).getTime())[0];

  const { data: latestEventPhotosRaw } = latestStatsEvent
    ? await supabase
        .from("event_photos")
        .select("id, storage_path")
        .eq("event_id", latestStatsEvent.event.id)
        .order("created_at", { ascending: true })
        .limit(6)
    : { data: [] as { id: string; storage_path: string }[] };

  const latestEventPhotos = (latestEventPhotosRaw ?? []).map((p) => ({
    id: p.id,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${p.storage_path}`,
  }));

  const groups = ((groupMembershipsRaw ?? []) as {
    role: "member" | "organiser" | null;
    groups: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      logo_url: string | null;
      group_type: string;
    } | null;
  }[])
    .flatMap((membership) => {
      if (!membership.groups) return [];
      return [{ ...membership.groups, role: membership.role ?? "member" }];
    });

  const upcoming = (organisedEvents ?? []).filter(
    (e) => e.status === "published" && e.starts_at >= now
  ) as EventWithCount[];

  const ninetyDaysAgo = new Date(new Date(now).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const recentlyAttended = joinedEvents.filter(
    (e) => e.starts_at >= ninetyDaysAgo && e.starts_at <= now
  ).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const bagsFromAttended = (attendedStatsRows ?? []).reduce(
    (sum, row) => sum + (row.bags_collected ?? 0),
    0
  );
  const totalHours = completedStatsRows.reduce(
    (sum, row) => sum + (row.duration_hours ?? 0),
    0
  );
  const displayName = profile.display_name ?? profile.username ?? "LitterLink member";
  const initials = displayName.charAt(0).toUpperCase();
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  // Guard against any value that bypassed action/DB validation
  const safeSocialUrl =
    profile.social_url && /^https?:\/\//i.test(profile.social_url)
      ? profile.social_url
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        {/* Avatar */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ring-brand/20">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={`${displayName}'s profile photo`}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand text-2xl font-bold text-white">
              {initials}
            </div>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            {profile.is_verified_organiser && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified organiser
              </span>
            )}
          </div>

          {profile.username && (
            <p className="mt-0.5 text-sm text-gray-400">@{profile.username}</p>
          )}

          <p className="mt-1 text-sm text-gray-400">Member since {memberSince}</p>

          {profile.bio && (
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{profile.bio}</p>
          )}

          {safeSocialUrl && (
            <a
              href={safeSocialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              {safeSocialUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
      </div>

      {/* Activity stats */}
      <section className="mt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileImpactCard
            icon={<Calendar className="h-5 w-5 text-brand" />}
            value={completedJoinedEvents.length.toLocaleString()}
            label="Events joined"
            subLabel="with impact logged"
          />
          <ProfileImpactCard
            icon={<CalendarPlus className="h-5 w-5 text-brand" />}
            value={completedOrganisedEvents.length.toLocaleString()}
            label="Events organised"
            subLabel="with impact logged"
          />
          <ProfileImpactCard
            icon={<Trash className="h-5 w-5 text-brand" />}
            value={bagsFromAttended.toLocaleString()}
            label="Bags collected"
            subLabel="From events attended"
          />
          <ProfileImpactCard
            icon={<Clock className="h-5 w-5 text-brand" />}
            value={totalHours.toFixed(1)}
            label="Hours volunteered"
          />
        </div>
      </section>


      {/* Upcoming organised events */}
      {upcoming.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            Upcoming events
            <span className="ml-2 text-sm font-normal text-gray-400">{upcoming.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {upcoming.length > 4 && (
            <p className="mt-3 text-sm text-gray-400">
              + {upcoming.length - 4} more upcoming events
            </p>
          )}
        </section>
      )}

      {/* Latest event impact highlight */}
      {latestStatsEvent && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            Latest event attended 
            <span className="ml-2 text-sm font-normal text-gray-400">with impact logged</span>
          </h2>
          <LatestEventHighlight
            event={latestStatsEvent.event}
            stats={latestStatsEvent.stats}
            photos={latestEventPhotos}
          />
        </section>
      )}
      
      {/* Recently attended events */}
      {recentlyAttended.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            Previous events
            <span className="ml-2 text-sm font-normal text-gray-400">last 90 days</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {recentlyAttended.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Groups */}
      {(groups ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Groups</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(groups ?? []).map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.slug}`}
                className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {group.logo_url ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={group.logo_url}
                      alt={group.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-sm font-bold text-brand">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 break-words whitespace-normal">{group.name}</p>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                      {group.role === "organiser" ? "Organiser" : "Member"}
                    </span>
                  </div>
                  {group.description && (
                    <p className="mt-0.5 line-clamp-3 text-xs text-gray-400 break-words whitespace-normal">{group.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ProfileImpactCard({
  icon,
  value,
  label,
  subLabel,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subLabel?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
      </div>
    </div>
  );
}

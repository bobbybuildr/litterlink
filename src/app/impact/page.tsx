import type { Metadata } from "next";
import Link from "next/link";
import { Trash2, Users, Calendar, Clock, BadgeCheck, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ShareImpactButton } from "@/components/ShareImpactButton";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "See the collective impact LitterLink volunteers are making across the UK — bags collected, hours completed, and more.",
};

async function getImpactData() {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { count: eventCount },
    { data: statsData },
    { data: completedEventsData },
    { count: groupCount },
    { count: verifiedOrgCount },
    { count: recentEventCount, data: recentEvents },
    { data: recentParticipants },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("event_stats")
      .select("event_id, bags_collected, actual_attendees, duration_hours, litter_types"),
    supabase
      .from("events")
      .select("id, location_postcode, organiser_id, group_id")
      .eq("status", "completed")
      .gte("starts_at", thirtyDaysAgo),
    supabase.from("groups").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_verified_organiser", true),
    supabase
      .from("events")
      .select("id", { count: "exact" })
      .eq("status", "completed")
      .gte("starts_at", thirtyDaysAgo),
    supabase
      .from("event_participants")
      .select("user_id")
      .eq("status", "confirmed")
      .gte("joined_at", thirtyDaysAgo),
  ]);

  const totalBags =
    statsData?.reduce((sum, s) => sum + (s.bags_collected ?? 0), 0) ?? 0;
  const totalVolunteers =
    statsData?.reduce((sum, s) => sum + (s.actual_attendees ?? 0), 0) ?? 0;
  const totalHours = Math.round(
    statsData?.reduce((sum, s) => sum + (s.duration_hours ?? 0), 0) ?? 0
  );

  // Top areas: aggregate by postcode district (outward code = part before the space)
  const statsByEventId = new Map(
    (statsData ?? []).map((s) => ([
      s.event_id,
      { bags: s.bags_collected ?? 0, attendees: s.actual_attendees ?? 0 },
    ]))
  );
  const districtMap = new Map<
    string,
    { totalBags: number; eventCount: number; volunteerTurnout: number }
  >();
  type CompletedEvent = { id: string; location_postcode: string; organiser_id: string | null; group_id: string | null };
  for (const event of (completedEventsData ?? []) as CompletedEvent[]) {
    const district = event.location_postcode.split(" ")[0].toUpperCase();
    const existing = districtMap.get(district) ?? {
      totalBags: 0,
      eventCount: 0,
      volunteerTurnout: 0,
    };
    const stats = statsByEventId.get(event.id);
    districtMap.set(district, {
      totalBags: existing.totalBags + (stats?.bags ?? 0),
      eventCount: existing.eventCount + 1,
      volunteerTurnout: existing.volunteerTurnout + (stats?.attendees ?? 0),
    });
  }
  const topAreas = Array.from(districtMap.entries())
    .map(([district, s]) => ({ district, ...s }))
    .sort((a, b) => b.totalBags - a.totalBags || b.eventCount - a.eventCount)
    .slice(0, 5);

  // Top organisers (last 30 days)
  const organiserMap = new Map<
    string,
    { eventCount: number; totalBags: number; totalAttendees: number }
  >();
  for (const event of (completedEventsData ?? []) as CompletedEvent[]) {
    if (!event.organiser_id) continue;
    const existing = organiserMap.get(event.organiser_id) ?? {
      eventCount: 0,
      totalBags: 0,
      totalAttendees: 0,
    };
    const stats = statsByEventId.get(event.id);
    organiserMap.set(event.organiser_id, {
      eventCount: existing.eventCount + 1,
      totalBags: existing.totalBags + (stats?.bags ?? 0),
      totalAttendees: existing.totalAttendees + (stats?.attendees ?? 0),
    });
  }
  const topOrganiserIds = Array.from(organiserMap.entries())
    .sort(
      ([, a], [, b]) =>
        b.eventCount - a.eventCount ||
        b.totalBags - a.totalBags ||
        b.totalAttendees - a.totalAttendees
    )
    .slice(0, 5)
    .map(([id]) => id);

  let topOrganisers: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified_organiser: boolean;
    eventCount: number;
    totalBags: number;
    totalAttendees: number;
  }> = [];
  if (topOrganiserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_verified_organiser")
      .in("id", topOrganiserIds);
    topOrganisers = topOrganiserIds
      .map((id) => {
        const profile = (profiles ?? []).find((p) => p.id === id);
        const stats = organiserMap.get(id)!;
        return {
          id,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          is_verified_organiser: profile?.is_verified_organiser ?? false,
          ...stats,
        };
      })
      .filter((o) => o.display_name);
  }

  // Most active groups (last 30 days)
  const groupMap = new Map<
    string,
    { eventCount: number; totalBags: number }
  >();
  for (const event of (completedEventsData ?? []) as CompletedEvent[]) {
    if (!event.group_id) continue;
    const existing = groupMap.get(event.group_id) ?? { eventCount: 0, totalBags: 0 };
    const stats = statsByEventId.get(event.id);
    groupMap.set(event.group_id, {
      eventCount: existing.eventCount + 1,
      totalBags: existing.totalBags + (stats?.bags ?? 0),
    });
  }
  const topGroupIds = Array.from(groupMap.entries())
    .sort(([, a], [, b]) => b.eventCount - a.eventCount || b.totalBags - a.totalBags)
    .slice(0, 5)
    .map(([id]) => id);

  let topGroups: Array<{
    id: string;
    name: string;
    slug: string;
    eventCount: number;
    totalBags: number;
  }> = [];
  if (topGroupIds.length > 0) {
    const { data: groupRows } = await supabase
      .from("groups")
      .select("id, name, slug")
      .in("id", topGroupIds);
    topGroups = topGroupIds
      .map((id) => {
        const group = (groupRows ?? []).find((g) => g.id === id);
        const stats = groupMap.get(id)!;
        return group ? { id, name: group.name, slug: group.slug, ...stats } : null;
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }

  // Last 30 days: bags collected from recently completed events
  const recentEventIds = (recentEvents ?? []).map((e) => e.id);
  let recentBags = 0;
  if (recentEventIds.length > 0) {
    const { data: recentStats } = await supabase
      .from("event_stats")
      .select("bags_collected")
      .in("event_id", recentEventIds);
    recentBags =
      recentStats?.reduce((sum, s) => sum + (s.bags_collected ?? 0), 0) ?? 0;
  }

  const recentUniqueVolunteers = new Set(
    (recentParticipants ?? []).map((p) => p.user_id)
  ).size;

  const litterTypeCounts: Record<string, number> = {};
  for (const row of statsData ?? []) {
    for (const type of row.litter_types ?? []) {
      if (type) {
        litterTypeCounts[type] = (litterTypeCounts[type] ?? 0) + 1;
      }
    }
  }
  const sortedLitterTypes = Object.entries(litterTypeCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return {
    eventCount: eventCount ?? 0,
    totalBags,
    totalVolunteers,
    totalHours,
    sortedLitterTypes,
    topAreas,
    topOrganisers,
    topGroups,
    groupCount: groupCount ?? 0,
    verifiedOrgCount: verifiedOrgCount ?? 0,
    recentEventCount: recentEventCount ?? 0,
    recentBags,
    recentUniqueVolunteers,
  };
}

function formatLitterType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function ImpactPage() {
  const data = await getImpactData();
  const maxLitterCount = data.sortedLitterTypes[0]?.[1] ?? 1;

  return (
    <div>
      {/* Hero */}
      <section className="bg-linear-to-br from-green-50 to-emerald-100 px-4 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-accent sm:text-5xl">
            Real people.{" "}
            <span className="text-brand">Real impact.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            Every event logged, every bag collected - here&apos;s the difference
            LitterLink volunteers are making across the UK.
          </p>
        </div>
      </section>

      {/* Core stats */}
      <section className="border-y border-gray-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Collective effort, measured
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={Trash2}
              value={data.totalBags.toLocaleString()}
              label="Bags collected"
              accent
              bgColor="bg-gray-50"
            />
            <StatCard
              icon={Users}
              value={data.totalVolunteers.toLocaleString()}
              label="Volunteer sessions"
              bgColor="bg-gray-50"
            />
            <StatCard
              icon={Calendar}
              value={data.eventCount.toLocaleString()}
              label="Events completed"
              bgColor="bg-gray-50"
            />
            <StatCard
              icon={Clock}
              value={data.totalHours.toLocaleString()}
              label="Hours of cleanup"
              bgColor="bg-gray-50"
            />
          </div>
        </div>
      </section>

      {/* Litter types */}
      {data.sortedLitterTypes.length > 0 && (
        <section className="px-4 py-14">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              What we&apos;re finding
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Types of litter recorded across completed events
            </p>
            <ul className="space-y-4">
              {data.sortedLitterTypes.map(([type, count]) => (
                <li key={type}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">
                      {formatLitterType(type)}
                    </span>
                    <span className="text-gray-400">
                      {count} {count === 1 ? "event" : "events"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand transition-all"
                      style={{
                        width: `${(count / maxLitterCount) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Community stats */}
      <section className="border-t border-gray-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
            A growing community
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CommunityCard
              icon={Building2}
              value={data.groupCount.toLocaleString()}
              label="Active groups"
              description="Community, school, charity and council groups organising cleanups across the UK."
            />
            <CommunityCard
              icon={BadgeCheck}
              value={data.verifiedOrgCount.toLocaleString()}
              label="Verified organisers"
              description="Trusted organisers approved to run events on LitterLink."
            />
          </div>
        </div>
      </section>

      {/* Last 30 days */}
      <section className="border-t border-gray-200 bg-gray-50 px-4 pt-14 pb-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">
            Last 30 days
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Momentum from the past month
          </p>
          <p className="mx-auto mb-8 max-w-xl rounded-xl border border-green-100 bg-green-50 px-5 py-3 text-center text-sm font-medium text-green-800">
            In the last 30 days,{" "}
            <span className="font-bold">{data.recentBags.toLocaleString()} bag{data.recentBags !== 1 ? "s" : ""}</span>{" "}
            {data.recentBags !== 1 ? "were" : "was"} removed across{" "}
            <span className="font-bold">{data.recentEventCount.toLocaleString()} event{data.recentEventCount !== 1 ? "s" : ""}</span>.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Trash2}
              value={data.recentBags.toLocaleString()}
              label="Bags collected"
              accent
              bgColor="bg-white"
            />
            <StatCard
              icon={Calendar}
              value={data.recentEventCount.toLocaleString()}
              label="Events completed"
              bgColor="bg-white"
            />
            <StatCard
              icon={Users}
              value={data.recentUniqueVolunteers.toLocaleString()}
              label="New volunteers"
              bgColor="bg-white"
            />
          </div>
        </div>
      </section>

      {/* Top areas (last 30 days) */}
      {data.topAreas.length > 0 && (
        <section className="px-4 pb-14 pt-1">
          <div className="mx-auto max-w-2xl">
            <p className="mb-8 text-center text-sm text-gray-500">
              Postcode districts leading the way on litter-picking in the last 30 days
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3 text-right">Bags</th>
                    <th className="px-4 py-3 text-right">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data.topAreas.map((area, i) => (
                    <tr key={area.district} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-gray-900">{area.district}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-brand">
                        {area.totalBags.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {area.eventCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Top organisers (last 30 days) */}
      {data.topOrganisers.length > 0 && (
        <section className="px-4 pt-1 pb-14">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              Top organisers
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Most active event hosts over the last 30 days
            </p>
            <ul className="space-y-3">
              {data.topOrganisers.map((org, i) => (
                <li
                  key={org.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {org.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.avatar_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                      {(org.display_name ?? "?")[0].toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-gray-900">
                        {org.display_name}
                      </span>
                      {org.is_verified_organiser && (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified organiser" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {org.totalBags.toLocaleString()} bags &middot;{" "}
                      {org.totalAttendees.toLocaleString()} volunteers
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-brand">{org.eventCount}</p>
                    <p className="text-xs text-gray-400">
                      {org.eventCount === 1 ? "event" : "events"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Most active groups (last 30 days) — TODO: uncomment when groups work is complete */}
      {/* {data.topGroups.length > 0 && (
        <section className="border-t border-gray-200 px-4 py-14">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              Most active groups
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Groups running the most events over the last 30 days
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-3">Group</th>
                    <th className="px-4 py-3 text-right">Events</th>
                    <th className="px-4 py-3 text-right">Bags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data.topGroups.map((group, i) => (
                    <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <Link
                            href={`/groups/${group.slug}`}
                            className="font-semibold text-gray-900 hover:text-brand transition-colors"
                          >
                            {group.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-brand">
                        {group.eventCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {group.totalBags.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )} */}

      {/* CTA */}
      <section className="bg-brand px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold">Add your effort to the total</h2>
          <p className="mt-2 text-green-100">
            Every action counts. Here&apos;s how you can get involved.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/events"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand shadow transition-colors hover:bg-green-50"
            >
              Join an upcoming cleanup
            </Link>
            <Link
              href="/events/create"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Start your own litter pick
            </Link>
            <Link
              href="/become-a-verified-organiser"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Become a verified organiser
            </Link>
            <ShareImpactButton />
          </div>
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  accent?: boolean;
  bgColor: string;
}

function StatCard({ icon: Icon, value, label, accent, bgColor }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-gray-100 p-6 text-center", bgColor)}>
      <Icon
        className={cn("mx-auto mb-3 h-6 w-6", accent ? "text-brand" : "text-gray-400")}
      />
      <p
        className={cn(
          "text-3xl font-extrabold",
          accent ? "text-brand" : "text-gray-900"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

interface CommunityCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  description: string;
}

function CommunityCard({ icon: Icon, value, label, description }: CommunityCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
      <div className="mb-3 flex items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-brand" />
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      </div>
      <p className="mb-1 font-semibold text-gray-800">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

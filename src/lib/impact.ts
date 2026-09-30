import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Period = "month" | "lastMonth" | "90d" | "all";
const PERIOD_VALUES: Period[] = ["month", "lastMonth", "90d", "all"];

export function isPeriod(value: string | undefined): value is Period {
  return !!value && (PERIOD_VALUES as string[]).includes(value);
}

export function getPeriodOptions(): Array<{ value: Period; label: string }> {
  return [
    { value: "month", label: "This month" },
    { value: "lastMonth", label: "Last month" },
    { value: "90d", label: "Last 90 days" },
    { value: "all", label: "All time" },
  ];
}

function getPeriodRange(period: Period): { start: string | null; end: string | null } {
  const now = new Date();
  switch (period) {
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: null };
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case "90d":
      return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), end: null };
    case "all":
      return { start: null, end: null };
  }
}

export function getPeriodDescription(period: Period): string {
  switch (period) {
    case "month":
      return "this month";
    case "lastMonth": {
      const lastMonthDate = new Date();
      lastMonthDate.setDate(1);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      return `in ${lastMonthDate.toLocaleString("en-GB", { month: "long" })}`;
    }
    case "90d":
      return "over the last 90 days";
    case "all":
      return "of all time";
  }
}

export async function getImpactData(
  organisersPeriod: Period,
  areasPeriod: Period,
  statsPeriod: Period,
  groupsPeriod: Period
) {
  const supabase = await createClient();

  const organisersPeriodRange = getPeriodRange(organisersPeriod);
  const areasPeriodRange = getPeriodRange(areasPeriod);
  const statsPeriodRange = getPeriodRange(statsPeriod);
  const groupsPeriodRange = getPeriodRange(groupsPeriod);

  let organiserEventsQuery = supabase
    .from("events")
    .select("id, organiser_id")
    .eq("status", "completed")
    .not("organiser_id", "is", null);
  if (organisersPeriodRange.start) {
    organiserEventsQuery = organiserEventsQuery.gte("starts_at", organisersPeriodRange.start);
  }
  if (organisersPeriodRange.end) {
    organiserEventsQuery = organiserEventsQuery.lt("starts_at", organisersPeriodRange.end);
  }

  let areaEventsQuery = supabase
    .from("events")
    .select("id, location_postcode, location_outcode, location_admin_district")
    .eq("status", "completed");
  if (areasPeriodRange.start) {
    areaEventsQuery = areaEventsQuery.gte("starts_at", areasPeriodRange.start);
  }
  if (areasPeriodRange.end) {
    areaEventsQuery = areaEventsQuery.lt("starts_at", areasPeriodRange.end);
  }

  let statsEventsQuery = supabase
    .from("events")
    .select("id", { count: "exact" })
    .eq("status", "completed");
  if (statsPeriodRange.start) {
    statsEventsQuery = statsEventsQuery.gte("starts_at", statsPeriodRange.start);
  }
  if (statsPeriodRange.end) {
    statsEventsQuery = statsEventsQuery.lt("starts_at", statsPeriodRange.end);
  }

  let statsParticipantsQuery = supabase
    .from("event_participants")
    .select("user_id")
    .eq("status", "confirmed");
  if (statsPeriodRange.start) {
    statsParticipantsQuery = statsParticipantsQuery.gte("joined_at", statsPeriodRange.start);
  }
  if (statsPeriodRange.end) {
    statsParticipantsQuery = statsParticipantsQuery.lt("joined_at", statsPeriodRange.end);
  }

  let groupEventsQuery = supabase
    .from("events")
    .select("id, group_id")
    .eq("status", "completed")
    .not("group_id", "is", null);
  if (groupsPeriodRange.start) {
    groupEventsQuery = groupEventsQuery.gte("starts_at", groupsPeriodRange.start);
  }
  if (groupsPeriodRange.end) {
    groupEventsQuery = groupEventsQuery.lt("starts_at", groupsPeriodRange.end);
  }

  const [
    { count: eventCount },
    { data: nationalStats },
    { data: litterTypeRows },
    { count: groupCount },
    { count: verifiedOrgCount },
    { count: recentEventCount, data: recentEvents },
    { data: recentParticipants },
    { data: organiserEventsData },
    { data: areaEventsData },
    { data: groupEventsData },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    // Pre-summed in Postgres — avoids pulling every event_stats row into the
    // app just to add them up, which silently truncated past 1000 rows.
    supabase.from("national_impact_stats").select("*").single(),
    supabase
      .from("litter_type_counts")
      .select("*")
      .order("count", { ascending: false }),
    supabase.from("groups").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_verified_organiser", true),
    statsEventsQuery,
    statsParticipantsQuery,
    organiserEventsQuery,
    areaEventsQuery,
    groupEventsQuery,
  ]);

  type NationalStats = {
    total_bags: number;
    total_volunteers: number;
    total_hours: number;
  };
  type LitterTypeCount = { litter_type: string; count: number };

  const totalBags = (nationalStats as NationalStats | null)?.total_bags ?? 0;
  const totalVolunteers = (nationalStats as NationalStats | null)?.total_volunteers ?? 0;
  const totalHours = Math.round((nationalStats as NationalStats | null)?.total_hours ?? 0);

  // Per-event breakdowns below (top areas/organisers/groups) only need stats
  // for the events those period-filtered queries actually returned, so scope
  // the event_stats lookup to just those ids instead of the whole table —
  // batched to stay under PostgREST's 1000-row cap per request.
  const relevantEventIds = Array.from(
    new Set([
      ...(organiserEventsData ?? []).map((e) => e.id),
      ...(areaEventsData ?? []).map((e) => e.id),
      ...(groupEventsData ?? []).map((e) => e.id),
    ])
  );
  const STATS_BATCH_SIZE = 1000;
  const scopedStatsRows: {
    event_id: string;
    bags_collected: number | null;
    actual_attendees: number | null;
  }[] = [];
  for (let i = 0; i < relevantEventIds.length; i += STATS_BATCH_SIZE) {
    const { data } = await supabase
      .from("event_stats")
      .select("event_id, bags_collected, actual_attendees")
      .in("event_id", relevantEventIds.slice(i, i + STATS_BATCH_SIZE));
    scopedStatsRows.push(...(data ?? []));
  }

  // Top areas: aggregate by the resolved local authority district name, so
  // postcodes sharing one place (e.g. several outcodes within Sandwell) are
  // combined under a single human-readable label rather than split by outcode.
  const statsByEventId = new Map(
    scopedStatsRows.map((s) => ([
      s.event_id,
      { bags: s.bags_collected ?? 0, attendees: s.actual_attendees ?? 0 },
    ]))
  );
  const districtMap = new Map<
    string,
    { totalBags: number; eventCount: number; volunteerTurnout: number }
  >();
  type AreaEvent = {
    id: string;
    location_postcode: string;
    location_outcode: string | null;
    location_admin_district: string | null;
  };
  for (const event of (areaEventsData ?? []) as AreaEvent[]) {
    const district =
      event.location_admin_district ??
      event.location_outcode ??
      event.location_postcode.split(" ")[0].toUpperCase();
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

  // Top organisers (selected period)
  const organiserMap = new Map<
    string,
    { eventCount: number; totalBags: number; totalAttendees: number }
  >();
  type OrganiserEvent = { id: string; organiser_id: string | null };
  for (const event of (organiserEventsData ?? []) as OrganiserEvent[]) {
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
    username: string | null;
    avatar_url: string | null;
    is_verified_organiser: boolean;
    eventCount: number;
    totalBags: number;
    totalAttendees: number;
  }> = [];
  if (topOrganiserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_verified_organiser")
      .in("id", topOrganiserIds);
    topOrganisers = topOrganiserIds
      .map((id) => {
        const profile = (profiles ?? []).find((p) => p.id === id);
        const stats = organiserMap.get(id)!;
        return {
          id,
          display_name: profile?.display_name ?? null,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          is_verified_organiser: profile?.is_verified_organiser ?? false,
          ...stats,
        };
      })
      .filter((o) => o.display_name);
  }

  // Most active groups (selected period)
  const groupMap = new Map<
    string,
    { eventCount: number; totalBags: number }
  >();
  type GroupEvent = { id: string; group_id: string | null };
  for (const event of (groupEventsData ?? []) as GroupEvent[]) {
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

  const sortedLitterTypes: Array<[string, number]> = (
    (litterTypeRows ?? []) as LitterTypeCount[]
  ).map((row) => [row.litter_type, row.count]);

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

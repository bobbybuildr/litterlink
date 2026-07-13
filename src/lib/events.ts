import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
export type OrganiserApplicationRow =
  Database["public"]["Tables"]["organiser_applications"]["Row"];

export type EventWithCount = EventRow & {
  organiser_name: string | null;
  organiser_username: string | null;
  organiser_avatar: string | null;
  organiser_is_verified: boolean;
  confirmed_count: number;
  group_name: string | null;
  group_slug: string | null;
};

export type EventWithStats = EventWithCount & {
  event_stats: Database["public"]["Tables"]["event_stats"]["Row"] | null;
};

export type EventPhotoRow =
  Database["public"]["Tables"]["event_photos"]["Row"];

/**
 * Fetch published events for the list/map view, optionally filtered by date range.
 * Radius filtering is intentionally left to the caller so the map can show all pins
 * while the list is filtered by proximity.
 */
export async function getPublishedEvents(options?: {
  limit?: number;
  from?: string;
  to?: string;
}): Promise<EventWithCount[]> {
  const supabase = await createClient();

  let query = supabase
    .from("events_with_counts")
    .select("*")
    .in("status", ["published", "completed"])
    .order("starts_at", { ascending: true })
    .limit(options?.limit ?? 100);

  if (options?.from) query = query.gte("starts_at", options.from);
  if (options?.to) query = query.lte("starts_at", `${options.to}T23:59:59`);

  const { data, error } = await query;

  if (error || !data) return [];

  return data as EventWithCount[];
}

/** Fetch a single event with its stats (for detail page). */
export async function getEventById(
  id: string
): Promise<EventWithStats | null> {
  const supabase = await createClient();

  const [{ data: event }, { data: stats }] = await Promise.all([
    supabase
      .from("events_with_counts")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("event_stats")
      .select("*")
      .eq("event_id", id)
      .maybeSingle(),
  ]);

  if (!event) return null;

  const eventStats =
    (stats as Database["public"]["Tables"]["event_stats"]["Row"] | null) ??
    null;
  return { ...(event as EventWithCount), event_stats: eventStats };
}

/** Fetch all events a user has joined (confirmed participation only). */
export async function getJoinedEvents(userId: string): Promise<EventWithCount[]> {
  const supabase = await createClient();

  const { data: participations } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("user_id", userId)
    .eq("status", "confirmed");

  const ids = participations?.map((p) => p.event_id) ?? [];
  if (!ids.length) return [];

  const { data } = await supabase
    .from("events_with_counts")
    .select("*")
    .in("id", ids)
    .order("starts_at", { ascending: true });

  return (data ?? []) as EventWithCount[];
}

/** Check if a user is already joined to an event. */
export async function getUserParticipation(
  eventId: string,
  userId: string
): Promise<"confirmed" | "waitlisted" | "cancelled" | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("event_participants")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.status as "confirmed" | "waitlisted" | "cancelled") ?? null;
}

export type EventParticipant = {
  joined_at: string;
  user_id: string;
  profiles: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

/** Fetch confirmed participants for an event, joined with their profile. */
export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("event_participants")
    .select("joined_at, user_id, profiles(username, display_name, avatar_url)")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .order("joined_at", { ascending: true });

  return (data ?? []) as EventParticipant[];
}

/** Fetch a group by its slug. */
export async function getGroupBySlug(
  slug: string
): Promise<Database["public"]["Tables"]["groups"]["Row"] | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", slug)
    .single();
  return (data as Database["public"]["Tables"]["groups"]["Row"] | null) ?? null;
}

export type GroupWithCounts = GroupRow & {
  creator_is_verified: boolean;
  member_count: number;
  upcoming_event_count: number;
  /** Weighted activity score over the trailing `ACTIVITY_WINDOW_DAYS` — see getPublishedGroups. */
  activity_score: number;
};

const ACTIVITY_WINDOW_DAYS = 30;

/**
 * Fetch all groups for the discovery list/map, enriched with the creator's
 * verified-organiser status, member count, upcoming (published) event count,
 * and a recent-activity score. Counts are computed client-side since there's
 * no `groups_with_counts` view yet.
 *
 * `activity_score` reflects engagement over the trailing 30 days: new
 * members joined, events that took place, and participants who joined those
 * events. Used to surface a "Featured Group" on the discovery page.
 */
export async function getPublishedGroups(): Promise<GroupWithCounts[]> {
  const supabase = await createClient();

  const now = new Date();
  const nowIso = now.toISOString();
  const since = new Date(now);
  since.setDate(since.getDate() - ACTIVITY_WINDOW_DAYS);
  const sinceIso = since.toISOString();

  const [{ data: groupRows }, { data: memberRows }, { data: eventRows }] =
    await Promise.all([
      supabase
        .from("groups")
        .select("*, profiles(is_verified_organiser)")
        .order("created_at", { ascending: false }),
      supabase.from("group_members").select("group_id, joined_at"),
      supabase
        .from("events")
        .select("id, group_id, starts_at, status")
        .not("group_id", "is", null),
    ]);

  // The hand-written Database type carries no relationship metadata, so the
  // Supabase client infers `never[]` for the joined select. Cast via unknown.
  type RawGroupRow = GroupRow & {
    profiles: { is_verified_organiser: boolean } | null;
  };
  type MemberRow = { group_id: string; joined_at: string };
  type GroupEventRow = { id: string; group_id: string | null; starts_at: string; status: string };

  const members = (memberRows ?? []) as MemberRow[];
  const groupEvents = (eventRows ?? []) as GroupEventRow[];

  const memberCounts = new Map<string, number>();
  const recentMemberCounts = new Map<string, number>();
  for (const row of members) {
    memberCounts.set(row.group_id, (memberCounts.get(row.group_id) ?? 0) + 1);
    if (row.joined_at >= sinceIso) {
      recentMemberCounts.set(row.group_id, (recentMemberCounts.get(row.group_id) ?? 0) + 1);
    }
  }

  const eventGroupMap = new Map<string, string>(); // event id -> group id
  const upcomingEventCounts = new Map<string, number>();
  const recentEventCounts = new Map<string, number>();
  for (const row of groupEvents) {
    if (!row.group_id) continue;
    eventGroupMap.set(row.id, row.group_id);
    if (row.status === "published" && row.starts_at >= nowIso) {
      upcomingEventCounts.set(row.group_id, (upcomingEventCounts.get(row.group_id) ?? 0) + 1);
    }
    if (row.status !== "cancelled" && row.starts_at >= sinceIso && row.starts_at <= nowIso) {
      recentEventCounts.set(row.group_id, (recentEventCounts.get(row.group_id) ?? 0) + 1);
    }
  }

  const eventIds = Array.from(eventGroupMap.keys());
  const { data: participantRows } = eventIds.length
    ? await supabase
        .from("event_participants")
        .select("event_id, joined_at")
        .in("event_id", eventIds)
        .eq("status", "confirmed")
        .gte("joined_at", sinceIso)
    : { data: [] as { event_id: string; joined_at: string }[] };

  const recentParticipantCounts = new Map<string, number>();
  for (const row of (participantRows ?? []) as { event_id: string; joined_at: string }[]) {
    const groupId = eventGroupMap.get(row.event_id);
    if (!groupId) continue;
    recentParticipantCounts.set(groupId, (recentParticipantCounts.get(groupId) ?? 0) + 1);
  }

  return ((groupRows ?? []) as unknown as RawGroupRow[]).map(
    ({ profiles, ...group }) => ({
      ...group,
      creator_is_verified: profiles?.is_verified_organiser ?? false,
      member_count: memberCounts.get(group.id) ?? 0,
      upcoming_event_count: upcomingEventCounts.get(group.id) ?? 0,
      activity_score:
        (recentMemberCounts.get(group.id) ?? 0) * 3 +
        (recentEventCounts.get(group.id) ?? 0) * 5 +
        (recentParticipantCounts.get(group.id) ?? 0) * 2,
    })
  );
}

/**
 * Pick the group with the highest recent-activity score to showcase as the
 * "Featured Group". Returns null if no group has any activity in the window.
 */
export function getFeaturedGroup(groups: GroupWithCounts[]): GroupWithCounts | null {
  let featured: GroupWithCounts | null = null;
  for (const group of groups) {
    if (group.activity_score > 0 && (!featured || group.activity_score > featured.activity_score)) {
      featured = group;
    }
  }
  return featured;
}

/** Fetch the set of group IDs a user belongs to (join/leave state on cards). */
export async function getUserGroupMemberships(
  userId: string
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  return new Set((data ?? []).map((row) => row.group_id));
}

/** Fetch all events for a group, ordered newest-first. */
export async function getEventsByGroupId(
  groupId: string
): Promise<EventWithCount[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events_with_counts")
    .select("*")
    .eq("group_id", groupId)
    .in("status", ["published", "completed", "cancelled"])
    .order("starts_at", { ascending: false });
  return (data ?? []) as EventWithCount[];
}

export type GroupMember = {
  user_id: string;
  role: "member" | "organiser";
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

/** Fetch all members of a group with their profile info, ordered by join date. */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at, profiles(display_name, avatar_url, username)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (!data) return [];

  // The hand-written Database type carries no relationship metadata, so the
  // Supabase client infers `never[]` for the joined select. Cast via unknown.
  type RawRow = {
    user_id: string;
    role: string;
    joined_at: string;
    profiles: { display_name: string | null; avatar_url: string | null; username: string | null } | null;
  };

  return (data as unknown as RawRow[]).map((row) => ({
    user_id: row.user_id,
    role: row.role as "member" | "organiser",
    joined_at: row.joined_at,
    display_name: row.profiles?.display_name ?? null,
    avatar_url: row.profiles?.avatar_url ?? null,
    username: row.profiles?.username ?? null,
  }));
}

/** Fetch all photos for a completed event, ordered oldest-first. */
export async function getEventPhotos(eventId: string): Promise<EventPhotoRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("event_photos")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (data ?? []) as EventPhotoRow[];
}

// Haversine distance in km
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

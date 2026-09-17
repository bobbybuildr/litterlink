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

// PostgREST caps unbounded selects at 1000 rows per request — paginate with
// `.range()` past that so results don't silently truncate.
const POSTGREST_MAX_ROWS = 1000;

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

  function buildQuery(from: number, to: number) {
    let query = supabase
      .from("events_with_counts")
      .select("*")
      .in("status", ["published", "completed"])
      .order("starts_at", { ascending: true })
      .range(from, to);

    if (options?.from) query = query.gte("starts_at", options.from);
    if (options?.to) query = query.lte("starts_at", `${options.to}T23:59:59`);

    return query;
  }

  if (options?.limit) {
    const { data, error } = await buildQuery(0, options.limit - 1);
    if (error || !data) return [];
    return data as EventWithCount[];
  }

  // No explicit limit — fetch every matching row via range-based pagination
  // so events beyond PostgREST's 1000-row cap don't silently vanish from
  // search results.
  const rows: EventWithCount[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + POSTGREST_MAX_ROWS - 1);
    if (error || !data) break;
    rows.push(...(data as EventWithCount[]));
    if (data.length < POSTGREST_MAX_ROWS) break;
    from += POSTGREST_MAX_ROWS;
  }
  return rows;
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
  /** Weighted activity score over the trailing 30 days — computed by the `groups_with_counts` view. */
  activity_score: number;
};

/**
 * Fetch all groups for the discovery list/map, enriched with the creator's
 * verified-organiser status, member count, upcoming (published) event count,
 * and a recent-activity score. Aggregation happens in Postgres via the
 * `groups_with_counts` view, so it isn't a full-table scan reduced in
 * JavaScript and isn't subject to PostgREST's per-request row cap.
 *
 * `activity_score` reflects engagement over the trailing 30 days: new
 * members joined, events that took place, and participants who joined those
 * events. Used to surface a "Featured Group" on the discovery page.
 */
export async function getPublishedGroups(): Promise<GroupWithCounts[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("groups_with_counts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as GroupWithCounts[];
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

  const rows: EventWithCount[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("events_with_counts")
      .select("*")
      .eq("group_id", groupId)
      .in("status", ["published", "completed", "cancelled"])
      .order("starts_at", { ascending: false })
      .range(from, from + POSTGREST_MAX_ROWS - 1);
    if (error || !data) break;
    rows.push(...(data as EventWithCount[]));
    if (data.length < POSTGREST_MAX_ROWS) break;
    from += POSTGREST_MAX_ROWS;
  }
  return rows;
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

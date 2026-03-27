import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventWithCount = EventRow & {
  organiser_name: string | null;
  organiser_avatar: string | null;
  confirmed_count: number;
};

export type EventWithStats = EventWithCount & {
  event_stats: Database["public"]["Tables"]["event_stats"]["Row"] | null;
};

/**
 * Fetch upcoming published events for the list/map view.
 * Optionally filter by radius (km) around a lat/lng.
 */
export async function getPublishedEvents(options?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
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

  // Apply haversine filter in JS — avoids needing PostGIS on free tier
  if (
    options?.lat != null &&
    options?.lng != null &&
    options?.radiusKm != null
  ) {
    return (data as EventWithCount[]).filter((e) => {
      const dist = haversineKm(options.lat!, options.lng!, e.latitude, e.longitude);
      return dist <= options.radiusKm!;
    });
  }

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

// Haversine distance in km
function haversineKm(
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

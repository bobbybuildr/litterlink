import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

/** 30 lookups per client IP per minute, per geocoding route. */
const GEOCODE_LIMIT = 30;
const GEOCODE_WINDOW_SECONDS = 60;

// On Vercel, x-forwarded-for is overwritten by the platform, so the first entry is the real client.
function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Records a lookup against the caller's IP for one of the public geocoding
 * routes. Returns 0 if allowed, otherwise the seconds until the limit resets.
 * Fails open so a database blip doesn't break location search.
 */
export async function consumeGeocodeRateLimit(
  bucket: "geocode" | "reverse-geocode",
  headers: Headers
): Promise<number> {
  const ipHash = createHash("sha256").update(getClientIp(headers)).digest("hex");

  // The hand-written Database type declares no Functions, so call rpc untyped.
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: `${bucket}:${ipHash}`,
    p_limit: GEOCODE_LIMIT,
    p_window_seconds: GEOCODE_WINDOW_SECONDS,
  });

  if (error) {
    console.error("[consumeGeocodeRateLimit]", error);
    return 0;
  }
  return (data as number | null) ?? 0;
}

/** 5 events per user per 24 hours. */
const CREATE_LIMIT = 5;
const CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 20 join attempts per user per 1 hour. */
const JOIN_LIMIT = 20;
const JOIN_WINDOW_MS = 60 * 60 * 1000;

/** 10 group joins per user per 1 hour. */
const GROUP_JOIN_LIMIT = 10;
const GROUP_JOIN_WINDOW_MS = 60 * 60 * 1000;

/**
 * 15-minute cooldown between reschedule notification emails per event.
 * Prevents an organiser from spamming participants by repeatedly toggling
 * the event datetime. Checked server-side against the DB so it holds across
 * all serverless instances.
 */
const RESCHEDULE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;

export function isRescheduleNotificationRateLimited(
  lastNotifiedAt: string | null
): boolean {
  if (!lastNotifiedAt) return false;
  return (
    Date.now() - new Date(lastNotifiedAt).getTime() <
    RESCHEDULE_NOTIFY_COOLDOWN_MS
  );
}

export async function isEventCreationRateLimited(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const since = new Date(Date.now() - CREATE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("organiser_id", userId)
    .gte("created_at", since);
  return (count ?? 0) >= CREATE_LIMIT;
}

export async function isJoinRateLimited(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const since = new Date(Date.now() - JOIN_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("event_participants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("joined_at", since);
  return (count ?? 0) >= JOIN_LIMIT;
}

export async function isGroupJoinRateLimited(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const since = new Date(Date.now() - GROUP_JOIN_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("joined_at", since);
  return (count ?? 0) >= GROUP_JOIN_LIMIT;
}

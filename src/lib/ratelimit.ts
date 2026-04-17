import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** 5 events per user per 24 hours. */
const CREATE_LIMIT = 5;
const CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 20 join attempts per user per 1 hour. */
const JOIN_LIMIT = 20;
const JOIN_WINDOW_MS = 60 * 60 * 1000;

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

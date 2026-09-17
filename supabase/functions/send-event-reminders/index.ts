/**
 * LitterLink — send-event-reminders Edge Function
 *
 * Runs on a scheduled cron. Finds events that:
 *   - are still in `published` status
 *   - started more than 12 hours ago (starts_at used as ends_at is optional)
 *   - have not yet had a stats reminder sent (stats_reminder_sent_at IS NULL)
 *   - have an organiser who has not opted out of organiser_status_updates
 *
 * For each qualifying event it:
 *   1. Sends a stats-reminder email via the Resend HTTP API
 *   2. Sets stats_reminder_sent_at = now() so the email is never re-sent
 *
 * Environment variables (set in Supabase dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY         — Resend API key
 *   RESEND_FROM            — From address (optional, falls back to default)
 *   NEXT_PUBLIC_SITE_URL   — Site root URL (optional, falls back to production URL)
 *   SUPABASE_URL           — Injected automatically by the Supabase runtime
 *   SERVICE_ROLE_KEY       — Must be set manually; grants read/write access
 *                            (cannot use SUPABASE_ prefix in Edge Function secrets)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM =
  Deno.env.get("RESEND_FROM") ?? "LitterLink <noreply@litterlink.co.uk>";
const SITE_URL =
  Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://litterlink.co.uk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? "";

interface EventRow {
  id: string;
  title: string;
  starts_at: string;
  organiser_id: string;
  organiser_email: string;
  organiser_name: string | null;
}

interface EventReminderQueryRow {
  id: string;
  title: string;
  starts_at: string;
  organiser_id: string | null;
  profiles: {
    display_name: string | null;
    email_preferences: { organiser_status_updates: boolean | null }[] | null;
  } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  });
}

async function sendReminderEmail(event: EventRow): Promise<void> {
  const eventUrl = `${SITE_URL}/events/${event.id}`;
  const greeting = `Hi${event.organiser_name ? ` ${event.organiser_name}` : ""},`;

  const text = [
    greeting,
    "",
    `We hope your litter-picking event "${event.title}" on ${formatDate(event.starts_at)} went well.`,
    "",
    "Please take a moment to enter your post-event stats. This includes: bags collected,",
    "number of people in attendance, litter types found, brand details, and more.",
    "Every stat helps show the collective impact happening across the UK and inspires more people to get involved.",
    "",
    "Enter stats here:",
    "",
    eventUrl,
    "",
    "Thank you for organising and making a difference in your community.",
    "The LitterLink team",
    "",
    SITE_URL
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: event.organiser_email,
      subject: `Time to log your stats for "${event.title}" — LitterLink`,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

Deno.serve(async () => {
  if (!RESEND_API_KEY) {
    console.error("[stats-reminder] RESEND_API_KEY not set — aborting");
    return new Response("RESEND_API_KEY not configured", { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch events that ended 12+ hours ago, still published, no reminder sent,
  // organiser opted in to status updates (or has no preference row).
  const { data: events, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      starts_at,
      organiser_id,
      profiles!inner (
        display_name,
        email_preferences (
          organiser_status_updates
        )
      )
    `
    )
    .eq("status", "published")
    .is("stats_reminder_sent_at", null)
    .not("organiser_id", "is", null)
    .lt("starts_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error("[stats-reminder] Failed to query events:", error.message);
    return new Response(`DB query failed: ${error.message}`, { status: 500 });
  }

  if (!events || events.length === 0) {
    console.log("[stats-reminder] No events require a stats reminder.");
    return new Response("No reminders to send", { status: 200 });
  }

  const reminderRows = events as EventReminderQueryRow[];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of reminderRows) {
    if (!row.organiser_id) {
      skipped++;
      continue;
    }

    // Skip if organiser has opted out of status updates
    const prefs = row.profiles?.email_preferences?.[0];
    if (prefs && prefs.organiser_status_updates === false) {
      skipped++;
      continue;
    }

    // Fetch organiser email from auth.users via the admin API (service role required)
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(row.organiser_id);
    if (userError || !userData?.user?.email) {
      console.warn(`[stats-reminder] No email for organiser of event ${row.id} — skipping`);
      skipped++;
      continue;
    }

    const event: EventRow = {
      id: row.id,
      title: row.title,
      starts_at: row.starts_at,
      organiser_id: row.organiser_id,
      organiser_email: userData.user.email,
      organiser_name: row.profiles?.display_name ?? null,
    };

    try {
      await sendReminderEmail(event);

      // Mark reminder as sent so it's never repeated
      const { error: updateError } = await supabase
        .from("events")
        .update({ stats_reminder_sent_at: new Date().toISOString() })
        .eq("id", event.id);

      if (updateError) {
        console.error(
          `[stats-reminder] Failed to mark event ${event.id} as reminded:`,
          updateError.message
        );
      } else {
        sent++;
      }
    } catch (err) {
      console.error(
        `[stats-reminder] Failed to send reminder for event ${event.id}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  const summary = `Stats reminders: ${sent} sent, ${skipped} skipped, ${failed} failed`;
  console.log(`[stats-reminder] ${summary}`);
  return new Response(summary, { status: 200 });
});

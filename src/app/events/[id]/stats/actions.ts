"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitStats(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Verify organiser owns this event
  const { data: event } = await supabase
    .from("events")
    .select("organiser_id, status, starts_at")
    .eq("id", eventId)
    .single();

  if (!event || event.organiser_id !== user.id) {
    redirect(`/events/${eventId}?error=Not+authorised`);
  }

  // Stats can only be submitted once — prevent re-submission on completed events
  if (event.status === "completed") {
    redirect(`/events/${eventId}`);
  }

  // Reject if the event hasn't started yet
  if (new Date(event.starts_at) > new Date()) {
    redirect(`/events/${eventId}/stats?error=${encodeURIComponent("Stats can only be submitted after the event has started.")}`);
  }

  const bags = formData.get("bags_collected")
    ? parseInt(formData.get("bags_collected") as string, 10)
    : null;
  const attendees = formData.get("actual_attendees")
    ? parseInt(formData.get("actual_attendees") as string, 10)
    : null;
  const duration = formData.get("duration_hours")
    ? parseFloat(formData.get("duration_hours") as string)
    : null;
  const litterTypes = (formData.getAll("litter_types") as string[]).filter(Boolean);
  const severity = formData.get("hotspot_severity")
    ? parseInt(formData.get("hotspot_severity") as string, 10)
    : null;
  const notableBrands = (formData.get("notable_brands") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  // Upsert stats + mark event as completed in a single round-trip
  const [statsResult] = await Promise.all([
    supabase.from("event_stats").upsert(
      {
        event_id: eventId,
        bags_collected: bags,
        actual_attendees: attendees,
        duration_hours: duration,
        litter_types: litterTypes.length > 0 ? litterTypes : null,
        hotspot_severity: severity,
        notable_brands: notableBrands,
        notes,
      },
      { onConflict: "event_id" }
    ),
    supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", eventId)
      .eq("organiser_id", user.id),
  ]);

  if (statsResult.error) {
    redirect(
      `/events/${eventId}/stats?error=${encodeURIComponent("Failed to save stats. Please try again.")}`
    );
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

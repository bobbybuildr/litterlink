"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractFields, type FormState } from "@/lib/forms";

const MAX_BAGS_COLLECTED = 300;
const MAX_ACTUAL_ATTENDEES = 500;
const MIN_DURATION_HOURS = 0.5;
const MAX_DURATION_HOURS = 24;
const MIN_SEVERITY = 1;
const MAX_SEVERITY = 5;
const MAX_NOTABLE_BRANDS_LENGTH = 500;
const MAX_NOTES_LENGTH = 1000;

// `extractFields` keeps only the last value of a repeated key, so re-add the checkbox group.
function fail(error: string, formData: FormData): FormState {
  return {
    error,
    fields: {
      ...extractFields(formData),
      litter_types: formData.getAll("litter_types").join("\n"),
    },
  };
}

export async function submitStats(
  eventId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
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
    return { error: "Not authorised." };
  }

  if (event.status === "cancelled") {
    return { error: "Cancelled events cannot accept stats." };
  }

  if (new Date(event.starts_at) > new Date()) {
    return fail("Stats can only be submitted after the event has started.", formData);
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

  if (bags !== null && (!Number.isInteger(bags) || bags < 0 || bags > MAX_BAGS_COLLECTED)) {
    return fail(`Bags collected must be between 0 and ${MAX_BAGS_COLLECTED}.`, formData);
  }

  if (
    attendees !== null &&
    (!Number.isInteger(attendees) || attendees < 0 || attendees > MAX_ACTUAL_ATTENDEES)
  ) {
    return fail(`Actual attendees must be between 0 and ${MAX_ACTUAL_ATTENDEES}.`, formData);
  }

  if (
    duration !== null &&
    (!Number.isFinite(duration) || duration < MIN_DURATION_HOURS || duration > MAX_DURATION_HOURS)
  ) {
    return fail(
      `Duration must be between ${MIN_DURATION_HOURS} and ${MAX_DURATION_HOURS} hours.`,
      formData
    );
  }

  if (
    severity !== null &&
    (!Number.isInteger(severity) || severity < MIN_SEVERITY || severity > MAX_SEVERITY)
  ) {
    return fail("Hotspot severity must be between 1 and 5.", formData);
  }

  if (notableBrands !== null && notableBrands.length > MAX_NOTABLE_BRANDS_LENGTH) {
    return fail(
      `Notable brands must be ${MAX_NOTABLE_BRANDS_LENGTH} characters or fewer.`,
      formData
    );
  }

  if (notes !== null && notes.length > MAX_NOTES_LENGTH) {
    return fail(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`, formData);
  }

  const { data: existingStats } = await supabase
    .from("event_stats")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

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
    console.error("[submitStats]", statsResult.error);
    return fail("Failed to save stats. Please try again.", formData);
  }

  revalidatePath(`/events/${eventId}`);
  const successParam = existingStats ? "statsUpdated=1" : "statsSaved=1";
  redirect(`/events/${eventId}?${successParam}`);
}

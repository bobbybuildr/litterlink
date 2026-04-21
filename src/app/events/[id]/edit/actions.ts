"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { geocodePostcode } from "@/lib/geocode";
import { sanitizeText } from "@/lib/sanitize";
import { sendEventUpdatedEmails } from "@/lib/email";
import { isRescheduleNotificationRateLimited } from "@/lib/ratelimit";

const TITLE_MAX = 120;
const DESC_MAX = 2000;
const ADDRESS_MAX = 200;
const CONTACT_MAX = 500;

export type EditEventState = {
  error: string | null;
  fields?: Record<string, string>;
};

function extractFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") fields[key] = value;
  });
  return fields;
}

function fail(error: string, formData: FormData): EditEventState {
  return { error, fields: extractFields(formData) };
}

/**
 * Interprets a naive datetime string ("YYYY-MM-DDTHH:MM") as Europe/London
 * local time and returns a UTC ISO string. Handles BST/GMT automatically.
 */
function londonToUTC(naive: string): string {
  const asUTC = new Date(naive + "Z");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asUTC);
  const p: Record<string, string> = {};
  parts.forEach(({ type, value }) => {
    p[type] = value;
  });
  const londonAsUTC = new Date(
    `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}Z`
  );
  const diff = londonAsUTC.getTime() - asUTC.getTime();
  return new Date(asUTC.getTime() - diff).toISOString();
}

export async function updateEvent(
  eventId: string,
  _prevState: EditEventState,
  formData: FormData
): Promise<EditEventState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Fetch existing event and verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select(
      "organiser_id, status, starts_at, ends_at, location_postcode, address_label, latitude, longitude, reschedule_notified_at"
    )
    .eq("id", eventId)
    .single();

  if (fetchError || !existing) return { error: "Event not found." };
  if (existing.organiser_id !== user.id) return { error: "Not authorised." };
  if (existing.status === "completed")
    return { error: "Completed events cannot be edited." };
  if (existing.status === "cancelled")
    return { error: "Cancelled events cannot be edited." };
  if (new Date(existing.starts_at) <= new Date())
    return { error: "Events cannot be edited once they have started." };

  // Fetch confirmed participant count for cap validation
  const { count: confirmedCount } = await supabase
    .from("event_participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  // Parse inputs
  const title = sanitizeText((formData.get("title") as string) ?? "");
  const description =
    sanitizeText((formData.get("description") as string) ?? "") || null;
  const addressLabel =
    sanitizeText((formData.get("address_label") as string) ?? "") || null;
  const startsAt = formData.get("starts_at") as string;
  const endsAt = (formData.get("ends_at") as string) || null;
  const maxAttendeesRaw = formData.get("max_attendees") as string;
  const maxAttendees =
    maxAttendeesRaw && maxAttendeesRaw.trim() !== ""
      ? parseInt(maxAttendeesRaw, 10)
      : null;
  const postcode = sanitizeText(
    (formData.get("postcode") as string) ?? ""
  ).toUpperCase();
  const organiserContactDetails =
    sanitizeText(
      (formData.get("organiser_contact_details") as string) ?? ""
    ) || null;

  // Validate required fields
  if (!title || !postcode || !startsAt) {
    return fail("Please fill in all required fields.", formData);
  }
  if (title.length > TITLE_MAX)
    return fail(`Title must be ${TITLE_MAX} characters or fewer.`, formData);
  if (description && description.length > DESC_MAX)
    return fail(
      `Description must be ${DESC_MAX} characters or fewer.`,
      formData
    );
  if (addressLabel && addressLabel.length > ADDRESS_MAX)
    return fail(
      `Meeting point must be ${ADDRESS_MAX} characters or fewer.`,
      formData
    );
  if (organiserContactDetails && organiserContactDetails.length > CONTACT_MAX)
    return fail(
      `Contact details must be ${CONTACT_MAX} characters or fewer.`,
      formData
    );
  if (isNaN(new Date(startsAt).getTime()))
    return fail("Invalid start date.", formData);

  const startsAtUTC = londonToUTC(startsAt);
  if (new Date(startsAtUTC) <= new Date())
    return fail("Start date must be in the future.", formData);

  let endsAtUTC: string | null = null;
  if (endsAt) {
    if (isNaN(new Date(endsAt).getTime()))
      return fail("Invalid end date.", formData);
    endsAtUTC = londonToUTC(endsAt);
    if (new Date(endsAtUTC) <= new Date(startsAtUTC))
      return fail("End time must be after start time.", formData);
  }
  if (maxAttendees !== null && (isNaN(maxAttendees) || maxAttendees < 1))
    return fail("Max attendees must be at least 1.", formData);
  if (maxAttendees !== null && maxAttendees < (confirmedCount ?? 0))
    return fail(
      `Cannot set max attendees below the current number of confirmed participants (${confirmedCount ?? 0}).`,
      formData
    );

  // Detect what changed — drives both the notification decision and email copy
  const dateTimeChanged =
    new Date(startsAtUTC).getTime() !==
      new Date(existing.starts_at).getTime() ||
    (endsAtUTC
      ? existing.ends_at === null ||
        new Date(endsAtUTC).getTime() !== new Date(existing.ends_at).getTime()
      : existing.ends_at !== null);

  const locationChanged =
    postcode !== existing.location_postcode ||
    (addressLabel ?? "") !== (existing.address_label ?? "");

  const shouldNotify = dateTimeChanged || locationChanged;

  // Re-geocode only if postcode changed
  let lat = existing.latitude;
  let lng = existing.longitude;
  if (postcode !== existing.location_postcode) {
    const geo = await geocodePostcode(postcode);
    if (!geo)
      return fail(
        `Postcode "${postcode}" wasn't recognised. Please enter a valid UK postcode.`,
        formData
      );
    lat = geo.latitude;
    lng = geo.longitude;
  }

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description,
      address_label: addressLabel,
      starts_at: startsAtUTC,
      ends_at: endsAtUTC,
      max_attendees: maxAttendees,
      location_postcode: postcode,
      latitude: lat,
      longitude: lng,
      organiser_contact_details: organiserContactDetails,
      content_updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) return { error: error.message };

  // Email confirmed participants (excluding organiser) if date/time or location changed
  // and the per-event notification cooldown (15 min) has elapsed.
  if (shouldNotify && !isRescheduleNotificationRateLimited(existing.reschedule_notified_at ?? null)) {
    const { data: participantRows } = await supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "confirmed")
      .neq("user_id", user.id);

    if (participantRows?.length) {
      const participantIds = participantRows.map((p) => p.user_id);

      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!
      );

      const [profileResults, emailResults] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", participantIds),
        Promise.all(
          participantIds.map((id) => admin.auth.admin.getUserById(id))
        ),
      ]);

      const profileMap = new Map(
        (profileResults.data ?? []).map((p) => [p.id, p.display_name])
      );

      const recipients = emailResults
        .map(({ data }) => {
          const email = data?.user?.email;
          const id = data?.user?.id;
          if (!email || !id) return null;
          return { email, name: profileMap.get(id) ?? null };
        })
        .filter(
          (r): r is { email: string; name: string | null } => r !== null
        );

      await sendEventUpdatedEmails({
        participants: recipients,
        eventId,
        title,
        startsAt: startsAtUTC,
        endsAt: endsAtUTC,
        addressLabel,
        postcode,
        dateTimeChanged,
        locationChanged,
      });

      // Record when we last notified so subsequent rapid edits are suppressed
      await supabase
        .from("events")
        .update({ reschedule_notified_at: new Date().toISOString() })
        .eq("id", eventId);
    }
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/sitemap.xml");
  redirect(`/events/${eventId}?updated=1`);
}

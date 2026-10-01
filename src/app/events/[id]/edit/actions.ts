"use server";

import { redirect } from "next/navigation";
import { withFlash } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LOCATION_MOVE_THRESHOLD_METRES,
  distanceMetres,
  resolveEventLocation,
} from "@/lib/geocode";
import { readFormFields } from "@/lib/input";
import { sendEventUpdatedEmails } from "@/lib/email";
import { isRescheduleNotificationRateLimited } from "@/lib/ratelimit";
import { normalisePostcode } from "@/lib/utils";
import { londonToUTC } from "@/lib/datetime";
import { fail, type FormState } from "@/lib/forms";

const TITLE_MAX = 120;
const DESC_MAX = 2000;
const ADDRESS_MAX = 200;
const CONTACT_MAX = 500;

export type EditEventState = FormState;

function parseCoordinate(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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
      "organiser_id, status, starts_at, ends_at, location_postcode, address_label, latitude, longitude, reschedule_notified_at, location_outcode, location_admin_district"
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
  const input = readFormFields(formData, {
    title: { type: "text", label: "Event title", max: TITLE_MAX, required: true },
    description: { type: "multiline", label: "Description", max: DESC_MAX },
    address_label: { type: "text", label: "Meeting point", max: ADDRESS_MAX },
    organiser_contact_details: { type: "multiline", label: "Contact details", max: CONTACT_MAX },
    postcode: { type: "postcode", label: "Postcode" },
  });
  if (!input.ok) return fail(input.error, formData);

  const {
    title,
    description,
    address_label: addressLabel,
    organiser_contact_details: organiserContactDetails,
  } = input.values;
  const postcode = input.values.postcode ?? "";
  const startsAt = formData.get("starts_at") as string;
  const endsAt = (formData.get("ends_at") as string) || null;
  const maxAttendeesRaw = formData.get("max_attendees") as string;
  const maxAttendees =
    maxAttendeesRaw && maxAttendeesRaw.trim() !== ""
      ? parseInt(maxAttendeesRaw, 10)
      : null;

  // The organiser either typed a postcode or dropped a pin (map / device location).
  const usePin = formData.get("location_mode") === "pin";
  const submittedLatitude = parseCoordinate(formData.get("latitude"));
  const submittedLongitude = parseCoordinate(formData.get("longitude"));

  // Validate required fields
  if (!startsAt) {
    return fail("Please fill in all required fields.", formData);
  }
  if (!usePin && !postcode) {
    return fail(
      "Please enter a postcode, use your current location, or choose the meeting point on the map.",
      formData
    );
  }
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

  // Resolve the location server-side — client-supplied postcode metadata is never
  // trusted — but skip the lookup entirely when the organiser left the location
  // alone, so an unchanged pin is never snapped back to the postcode centroid.
  let lat = existing.latitude;
  let lng = existing.longitude;
  let storedPostcode = existing.location_postcode;
  let outcode = existing.location_outcode;
  let adminDistrict = existing.location_admin_district;

  const pinUnmoved =
    usePin &&
    submittedLatitude !== null &&
    submittedLongitude !== null &&
    distanceMetres(
      submittedLatitude,
      submittedLongitude,
      existing.latitude,
      existing.longitude
    ) <= LOCATION_MOVE_THRESHOLD_METRES;

  const postcodeUnchanged =
    !usePin &&
    normalisePostcode(postcode) ===
      normalisePostcode(existing.location_postcode);

  if (!pinUnmoved && !postcodeUnchanged) {
    const resolved = await resolveEventLocation({
      usePin,
      postcode,
      latitude: submittedLatitude,
      longitude: submittedLongitude,
    });
    if (!resolved.ok) return fail(resolved.error, formData);

    lat = resolved.location.latitude;
    lng = resolved.location.longitude;
    storedPostcode = resolved.location.postcode;
    outcode = resolved.location.outcode;
    adminDistrict = resolved.location.adminDistrict;
  }

  // Reformatting a postcode ("sw1a1aa" → "SW1A 1AA") or nudging the pin a few
  // metres is not a location change worth emailing participants about.
  const locationChanged =
    normalisePostcode(storedPostcode) !==
      normalisePostcode(existing.location_postcode) ||
    distanceMetres(lat, lng, existing.latitude, existing.longitude) >
      LOCATION_MOVE_THRESHOLD_METRES ||
    (addressLabel ?? "") !== (existing.address_label ?? "");

  const shouldNotify = dateTimeChanged || locationChanged;

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description,
      address_label: addressLabel,
      starts_at: startsAtUTC,
      ends_at: endsAtUTC,
      max_attendees: maxAttendees,
      location_postcode: storedPostcode,
      latitude: lat,
      longitude: lng,
      location_outcode: outcode,
      location_admin_district: adminDistrict,
      organiser_contact_details: organiserContactDetails,
      content_updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("[updateEvent]", error);
    return fail("Failed to update event. Please try again.", formData);
  }

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

      const admin = createAdminClient();

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
        postcode: storedPostcode,
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
  redirect(withFlash(`/events/${eventId}`, "eventUpdated"));
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveEventLocation } from "@/lib/geocode";
import { sendEventCreatedEmail } from "@/lib/email";
import { readFormFields } from "@/lib/input";
import { isEventCreationRateLimited } from "@/lib/ratelimit";
import { londonToUTC } from "@/lib/datetime";
import { fail, type FormState } from "@/lib/forms";

const TITLE_MAX = 120;
const DESC_MAX = 2000;
const ADDRESS_MAX = 200;
const CONTACT_MAX = 500;

export type CreateEventState = FormState;

function parseCoordinate(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createEvent(
  _prevState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  if (await isEventCreationRateLimited(user.id, supabase)) {
    return fail("You've created too many events recently. Please wait before creating another.", formData);
  }

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
  const maxAttendees = formData.get("max_attendees")
    ? parseInt(formData.get("max_attendees") as string, 10)
    : null;
  const rawGroupId = (formData.get("group_id") as string | null) ?? null;
  const groupId = rawGroupId && rawGroupId !== "" ? rawGroupId : null;

  // The organiser either typed a postcode or dropped a pin (map / device location).
  const usePin = formData.get("location_mode") === "pin";
  const latitude = parseCoordinate(formData.get("latitude"));
  const longitude = parseCoordinate(formData.get("longitude"));

  if (!startsAt) {
    return fail("Please fill in all required fields.", formData);
  }
  if (!usePin && !postcode) {
    return fail(
      "Please enter a postcode, use your current location, or choose the meeting point on the map.",
      formData,
    );
  }

  // Server-side date validation (client min attribute can be bypassed)
  if (isNaN(new Date(startsAt).getTime())) {
    return fail("Invalid start date.", formData);
  }
  const startsAtUTC = londonToUTC(startsAt);
  const startsDate = new Date(startsAtUTC);
  if (startsDate < new Date()) {
    return fail("Start date must be in the future.", formData);
  }
  let endsAtUTC: string | null = null;
  if (endsAt) {
    if (isNaN(new Date(endsAt).getTime())) {
      return fail("The end date can not be before the start date.", formData);
    }
    endsAtUTC = londonToUTC(endsAt);
    if (new Date(endsAtUTC) <= startsDate) {
      return fail("The end date can not be before the start date.", formData);
    }
  }
  if (maxAttendees !== null && (isNaN(maxAttendees) || maxAttendees < 1)) {
    return fail("Max attendees must be at least 1.", formData);
  }

  // If a group_id was supplied, verify it belongs to the current user server-side
  if (groupId) {
    const { data: group } = await supabase
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .eq("created_by", user.id)
      .maybeSingle();

    if (!group) {
      return fail("Selected group is invalid or not owned by you.", formData);
    }
  }

  // Resolve the location server-side — client-supplied postcode metadata is never trusted
  const resolved = await resolveEventLocation({
    usePin,
    postcode,
    latitude,
    longitude,
  });
  if (!resolved.ok) {
    return fail(resolved.error, formData);
  }
  const location = resolved.location;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organiser_id: user.id,
      group_id: groupId,
      title,
      description,
      location_postcode: location.postcode,
      latitude: location.latitude,
      longitude: location.longitude,
      location_outcode: location.outcode,
      location_admin_district: location.adminDistrict,
      address_label: addressLabel,
      starts_at: startsAtUTC,
      ends_at: endsAtUTC,
      max_attendees: maxAttendees,
      organiser_contact_details: organiserContactDetails,
      status: "published",
    })
    .select("id")
    .single();

  if (error || !event) {
    return fail("Failed to create event. Please try again.", formData);
  }

  const joinEvent = formData.get("join_event") === "1";
  if (joinEvent) {
    await supabase.from("event_participants").insert({
      event_id: event.id,
      user_id: user.id,
      status: "confirmed",
    });
  }

  if (user.email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    await sendEventCreatedEmail({
      organiserEmail: user.email,
      organiserName: profile?.display_name ?? null,
      eventId: event.id,
      title,
      startsAt: startsAtUTC,
      endsAt: endsAtUTC,
      addressLabel,
      postcode: location.postcode,
    });
  }

  redirect(`/events/${event.id}`);
}

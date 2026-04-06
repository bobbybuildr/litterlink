"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodePostcode } from "@/lib/geocode";
import { sendEventCreatedEmail } from "@/lib/email";
import { sanitizeText } from "@/lib/sanitize";
import { isEventCreationRateLimited } from "@/lib/ratelimit";

const TITLE_MAX = 120;
const DESC_MAX = 2000;
const ADDRESS_MAX = 200;
const CONTACT_MAX = 500;

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  if (await isEventCreationRateLimited(user.id, supabase)) {
    redirect(
      `/events/create?error=${encodeURIComponent("You've created too many events recently. Please wait before creating another.")}`
    );
  }

  const postcode = sanitizeText((formData.get("postcode") as string) ?? "").toUpperCase();
  const title = sanitizeText((formData.get("title") as string) ?? "");
  const description = sanitizeText((formData.get("description") as string) ?? "") || null;
  const addressLabel = sanitizeText((formData.get("address_label") as string) ?? "") || null;
  const startsAt = formData.get("starts_at") as string;
  const endsAt = (formData.get("ends_at") as string) || null;
  const maxAttendees = formData.get("max_attendees")
    ? parseInt(formData.get("max_attendees") as string, 10)
    : null;
  const rawGroupId = (formData.get("group_id") as string | null) ?? null;
  const groupId = rawGroupId && rawGroupId !== "" ? rawGroupId : null;
  const organiserContactDetails =
    sanitizeText((formData.get("organiser_contact_details") as string) ?? "") || null;

  // Length validation
  if (title.length > TITLE_MAX) {
    redirect(`/events/create?error=${encodeURIComponent(`Event title must be ${TITLE_MAX} characters or fewer.`)}`);
  }
  if (description && description.length > DESC_MAX) {
    redirect(`/events/create?error=${encodeURIComponent(`Description must be ${DESC_MAX} characters or fewer.`)}`);
  }
  if (addressLabel && addressLabel.length > ADDRESS_MAX) {
    redirect(`/events/create?error=${encodeURIComponent(`Meeting point must be ${ADDRESS_MAX} characters or fewer.`)}`);
  }
  if (organiserContactDetails && organiserContactDetails.length > CONTACT_MAX) {
    redirect(`/events/create?error=${encodeURIComponent(`Contact details must be ${CONTACT_MAX} characters or fewer.`)}`);
  }

  // Validate required fields
  if (!title || !postcode || !startsAt) {
    redirect("/events/create?error=Please+fill+in+all+required+fields.");
  }

  // Server-side date validation (client min attribute can be bypassed)
  const startsDate = new Date(startsAt);
  if (isNaN(startsDate.getTime())) {
    redirect(`/events/create?error=${encodeURIComponent("Invalid start date.")}`);
  }
  if (startsDate < new Date()) {
    redirect(`/events/create?error=${encodeURIComponent("Start date must be in the future.")}`);
  }
  if (endsAt) {
    const endsDate = new Date(endsAt);
    if (isNaN(endsDate.getTime()) || endsDate <= startsDate) {
      redirect(`/events/create?error=${encodeURIComponent("End time must be after the start time.")}`);
    }
  }
  if (maxAttendees !== null && (isNaN(maxAttendees) || maxAttendees < 1)) {
    redirect(`/events/create?error=${encodeURIComponent("Max attendees must be at least 1.")}`);
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
      redirect(
        `/events/create?error=${encodeURIComponent("Selected group is invalid or not owned by you.")}`
      );
    }
  }

  // Geocode the postcode
  const geo = await geocodePostcode(postcode);
  if (!geo) {
    redirect(
      `/events/create?error=${encodeURIComponent(`Postcode "${postcode}" wasn't recognised. Please enter a valid UK postcode.`)}`
    );
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organiser_id: user.id,
      group_id: groupId,
      title,
      description,
      location_postcode: geo.postcode,
      latitude: geo.latitude,
      longitude: geo.longitude,
      address_label: addressLabel,
      starts_at: startsAt,
      ends_at: endsAt,
      max_attendees: maxAttendees,
      organiser_contact_details: organiserContactDetails,
      status: "published",
    })
    .select("id")
    .single();

  if (error || !event) {
    redirect(
      `/events/create?error=${encodeURIComponent("Failed to create event. Please try again.")}`
    );
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
      startsAt,
      endsAt,
      addressLabel,
      postcode: geo.postcode,
    });
  }

  redirect(`/events/${event.id}`);
}

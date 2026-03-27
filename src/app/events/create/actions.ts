"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodePostcode } from "@/lib/geocode";

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const postcode = (formData.get("postcode") as string).trim().toUpperCase();
  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string).trim() || null;
  const addressLabel = (formData.get("address_label") as string).trim() || null;
  const startsAt = formData.get("starts_at") as string;
  const endsAt = (formData.get("ends_at") as string) || null;
  const maxAttendees = formData.get("max_attendees")
    ? parseInt(formData.get("max_attendees") as string, 10)
    : null;

  // Validate required fields
  if (!title || !postcode || !startsAt) {
    redirect("/events/create?error=Please+fill+in+all+required+fields.");
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
      title,
      description,
      location_postcode: geo.postcode,
      latitude: geo.latitude,
      longitude: geo.longitude,
      address_label: addressLabel,
      starts_at: startsAt,
      ends_at: endsAt,
      max_attendees: maxAttendees,
      status: "published",
    })
    .select("id")
    .single();

  if (error || !event) {
    redirect(
      `/events/create?error=${encodeURIComponent("Failed to create event. Please try again.")}`
    );
  }

  redirect(`/events/${event.id}`);
}

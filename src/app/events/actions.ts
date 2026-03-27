"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function joinEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to join an event." };

  const { error } = await supabase.from("event_participants").insert({
    event_id: eventId,
    user_id: user.id,
    status: "confirmed",
  });

  if (error) {
    // 23505 = unique_violation — already joined
    if (error.code === "23505") return { error: "You are already joined." };
    return { error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return { error: null };
}

export async function leaveEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { error: null };
}

export async function cancelEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Verify ownership before mutating — never trust the client
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("organiser_id, status")
    .eq("id", eventId)
    .single();

  if (fetchError || !event) return { error: "Event not found." };
  if (event.organiser_id !== user.id) return { error: "Not authorised." };
  if (event.status === "cancelled") return { error: "Event is already cancelled." };
  if (event.status === "completed") return { error: "Completed events cannot be cancelled." };

  const { error } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId);

  if (error) return { error: error.message };

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { error: null };
}

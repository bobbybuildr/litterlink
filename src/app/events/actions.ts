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

export async function uploadEventPhoto(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Authorisation: only the event organiser may upload photos
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("organiser_id, status")
    .eq("id", eventId)
    .single();

  if (fetchError || !event) return { error: "Event not found." };
  if (event.organiser_id !== user.id)
    return { error: "Only the organiser can upload photos." };
  if (event.status !== "completed")
    return { error: "Photos can only be uploaded once the event is completed." };

  const files = formData.getAll("photos") as File[];
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);
  if (!validFiles.length) return { error: "No files selected." };

  const { count: existingCount, error: countError } = await supabase
    .from("event_photos")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (countError) return { error: "Could not verify photo count." };
  const MAX_PHOTOS = 10;
  if ((existingCount ?? 0) >= MAX_PHOTOS)
    return { error: "This event already has the maximum of 10 photos." };
  const remaining = MAX_PHOTOS - (existingCount ?? 0);
  if (validFiles.length > remaining)
    return { error: `Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added to this event.` };

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  const errors: string[] = [];

  for (const file of validFiles) {
    if (!allowedTypes.has(file.type)) {
      errors.push(`${file.name}: unsupported file type.`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: exceeds the 5 MB limit.`);
      continue;
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const storagePath = `${eventId}/${user.id}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("event-photos")
      .upload(storagePath, file, { contentType: "image/webp" });

    if (uploadError) {
      errors.push(`${file.name}: upload failed.`);
      continue;
    }

    const { error: dbError } = await supabase.from("event_photos").insert({
      event_id: eventId,
      uploaded_by: user.id,
      storage_path: storagePath,
    });

    if (dbError) {
      // Roll back the storage object if the DB row fails
      await supabase.storage.from("event-photos").remove([storagePath]);
      errors.push(`${file.name}: failed to save.`);
    }
  }

  revalidatePath(`/events/${eventId}`);
  return { error: errors.length ? errors.join(" ") : null };
}

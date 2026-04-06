"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendEventJoinedEmail, sendEventLeftEmail, sendEventCancelledEmails } from "@/lib/email";
import { isJoinRateLimited } from "@/lib/ratelimit";
export async function joinEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to join an event." };

  if (await isJoinRateLimited(user.id, supabase)) {
    return { error: "You've joined too many events recently. Please try again later." };
  }

  // Verify the event is still published and has capacity
  const { data: eventMeta } = await supabase
    .from("events")
    .select("status, max_attendees")
    .eq("id", eventId)
    .single();

  if (!eventMeta || eventMeta.status !== "published") {
    return { error: "This event is no longer accepting participants." };
  }
  if (eventMeta.max_attendees !== null) {
    const { count } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed");
    if ((count ?? 0) >= eventMeta.max_attendees) {
      return { error: "This event is full." };
    }
  }

  const { error } = await supabase.from("event_participants").insert({
    event_id: eventId,
    user_id: user.id,
    status: "confirmed",
  });

  if (error) {
    // 23505 = unique_violation — already joined
    if (error.code === "23505") return { error: "You are already joined." };
    // P0001 = capacity trigger fired — event filled up between the pre-check and insert
    if (error.code === "P0001" && error.message === "event_full")
      return { error: "This event just filled up. You weren't able to join in time." };
    return { error: error.message };
  }

  if (user.email) {
    const { data: event } = await supabase
      .from("events")
      .select("title, starts_at, ends_at, address_label, location_postcode")
      .eq("id", eventId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (event) {
      await sendEventJoinedEmail({
        userId: user.id,
        userEmail: user.email,
        userName: profile?.display_name ?? null,
        eventId,
        title: event.title,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        addressLabel: event.address_label,
        postcode: event.location_postcode,
      });
    }
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

  if (user.email) {
    const { data: event } = await supabase
      .from("events")
      .select("title, starts_at")
      .eq("id", eventId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (event) {
      await sendEventLeftEmail({
        userId: user.id,
        userEmail: user.email,
        userName: profile?.display_name ?? null,
        eventId,
        title: event.title,
        startsAt: event.starts_at,
      });
    }
  }

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
    .select("organiser_id, status, title, starts_at")
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

  // Notify all confirmed participants by email
  const { data: participants } = await supabase
    .from("event_participants")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .neq("user_id", user.id); // exclude the organiser

  if (participants?.length) {
    const participantIds = participants.map((p) => p.user_id);

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
      .filter((r): r is { email: string; name: string | null } => r !== null);

    await sendEventCancelledEmails({
      participants: recipients,
      eventId,
      title: event.title,
      startsAt: event.starts_at,
    });
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
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

    const safeName = `${crypto.randomUUID()}.webp`;
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

export async function deleteEventPhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { data: photo, error: fetchError } = await supabase
    .from("event_photos")
    .select("id, event_id, uploaded_by, storage_path")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) return { error: "Photo not found." };
  if (photo.uploaded_by !== user.id) return { error: "Not authorised." };

  const { error: dbError } = await supabase
    .from("event_photos")
    .delete()
    .eq("id", photoId);

  if (dbError) return { error: "Failed to delete photo record." };

  const { error: storageError } = await supabase.storage
    .from("event-photos")
    .remove([photo.storage_path]);

  if (storageError) return { error: "Failed to delete photo from storage." };

  revalidatePath(`/events/${photo.event_id}`);
  return { error: null };
}

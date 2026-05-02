"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { geocodePostcode } from "@/lib/geocode";
import { sanitizeText } from "@/lib/sanitize";

export type ProfileState = { error?: string; success?: boolean } | null;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const displayName = sanitizeText((formData.get("display_name") as string) ?? "") || null;
  const postcode = (formData.get("postcode") as string)?.trim().toUpperCase();
  const usernameRaw = (formData.get("username") as string)?.trim().toLowerCase();
  const username = usernameRaw || null;
  const bio = sanitizeText((formData.get("bio") as string) ?? "") || null;
  const socialUrl = (formData.get("social_url") as string)?.trim() || null;

  // Validate username format
  if (username !== null) {
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return { error: "Username must be 3–30 characters and contain only lowercase letters, digits, and underscores." };
    }
  }

  // Validate bio length
  if (bio !== null && bio.length > 300) {
    return { error: "Bio must be 300 characters or fewer." };
  }

  // Validate social URL
  if (socialUrl !== null && !/^https?:\/\//.test(socialUrl)) {
    return { error: "Website or social link must start with http:// or https://." };
  }

  // Validate postcode if one was provided
  if (postcode) {
    const geo = await geocodePostcode(postcode);
    if (!geo) {
      return { error: `"${postcode}" isn't a recognised UK postcode. Please check and try again.` };
    }
  }

  // Handle optional avatar upload
  let avatarUrl: string | undefined;
  const avatarFile = formData.get("avatar") as File | null;

  if (avatarFile && avatarFile.size > 0) {
    if (!ALLOWED_TYPES.includes(avatarFile.type)) {
      return { error: "Avatar must be a JPEG, PNG, or WebP image." };
    }
    if (avatarFile.size > MAX_SIZE_BYTES) {
      return { error: "Avatar must be under 5 MB." };
    }

    // Normalise extension: image/jpeg → jpg
    const ext = avatarFile.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) {
      return { error: "Failed to upload avatar. Please try again." };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    // Append cache-busting param so the browser fetches the new image
    avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      postcode: postcode || null,
      username,
      bio,
      social_url: socialUrl,
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken. Please choose another." };
    }
    return { error: "Failed to save profile. Please try again." };
  }

  // Save email preferences
  const { error: prefsError } = await supabase
    .from("email_preferences")
    .upsert(
      {
        user_id: user.id,
        event_notifications: formData.get("event_notifications") === "on",
        organiser_status_updates: formData.get("organiser_status_updates") === "on",
        new_nearby_events: formData.get("new_nearby_events") === "on",
        marketing_emails: formData.get("marketing_emails") === "on",
        newsletter: formData.get("newsletter") === "on",
      },
      { onConflict: "user_id" }
    );

  if (prefsError) return { error: "Failed to save email preferences. Please try again." };

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout"); // refreshes the navbar avatar

  return { success: true };
}

/**
 * Permanently deletes the authenticated user's account.
 *
 * What is removed:
 *   - Avatar from Storage
 *   - Event photos from Storage (DB rows cascade via profile deletion)
 *   - organiser_contact_details cleared from the user's events (personal data)
 *   - The Supabase auth user record (via service role)
 *     → cascades to: profiles, email_preferences, organiser_applications,
 *                     event_participants, event_photos (DB rows)
 *     → sets NULL on: events.organiser_id, groups.created_by
 *       (events/groups/stats are preserved for community record-keeping)
 */
export async function deleteAccount(
  _prev: ProfileState,
  _formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  // 1. Collect event photo storage paths before cascade wipes the DB rows
  const { data: photos } = await supabase
    .from("event_photos")
    .select("storage_path")
    .eq("uploaded_by", user.id);

  // 2. Clear organiser_contact_details (may contain phone numbers / emails)
  //    from every event the user organised. The organiser_id column will be
  //    set to NULL by the FK cascade, but contact details must be cleared
  //    explicitly because the constraint only becomes active on new rows.
  await supabase
    .from("events")
    .update({ organiser_contact_details: null })
    .eq("organiser_id", user.id);

  // 3. Remove event photos from Storage
  if (photos?.length) {
    await supabase.storage
      .from("event-photos")
      .remove(photos.map((p) => p.storage_path));
  }

  // 4. Remove avatar from Storage (all possible extensions)
  await supabase.storage
    .from("avatars")
    .remove(["jpg", "jpeg", "png", "webp"].map((ext) => `${user.id}/avatar.${ext}`));

  // 5. Delete the auth user via the service role client.
  //    This removes the row from auth.users, which cascades to public.profiles
  //    and all tables that reference it with ON DELETE CASCADE.
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return { error: "Failed to delete your account. Please try again or contact hello@litterlink.co.uk." };
  }

  // 6. Clear the session cookie (best-effort — auth user is already gone)
  await supabase.auth.signOut().catch(() => undefined);

  redirect("/");
}

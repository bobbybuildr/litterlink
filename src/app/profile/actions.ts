"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const displayName = (formData.get("display_name") as string)?.trim();
  const postcode = (formData.get("postcode") as string)?.trim().toUpperCase();

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
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: "Failed to save profile. Please try again." };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout"); // refreshes the navbar avatar

  return { success: true };
}

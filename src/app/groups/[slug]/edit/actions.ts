"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";

export type EditGroupState = {
  error: string | null;
  fields?: Record<string, string>;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function extractFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") fields[key] = value;
  });
  return fields;
}

function fail(error: string, formData: FormData): EditGroupState {
  return { error, fields: extractFields(formData) };
}

export async function updateGroup(
  groupId: string,
  _prevState: EditGroupState,
  formData: FormData
): Promise<EditGroupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: existing, error: fetchError } = await supabase
    .from("groups")
    .select("created_by, slug")
    .eq("id", groupId)
    .single();

  if (fetchError || !existing) return { error: "Group not found." };
  if (existing.created_by !== user.id) return { error: "Not authorised." };

  const name = sanitizeText((formData.get("name") as string) ?? "").trim();
  const description =
    sanitizeText((formData.get("description") as string) ?? "").trim() || null;
  const groupType = (formData.get("group_type") as string | null)?.trim() ?? "";
  const websiteUrl =
    (formData.get("website_url") as string | null)?.trim() || null;
  const socialUrl =
    (formData.get("social_url") as string | null)?.trim() || null;
  const contactEmail =
    sanitizeText((formData.get("contact_email") as string) ?? "").trim() ||
    null;
  const logoFile = formData.get("logo") as File | null;
  const removeLogo = formData.get("remove_logo") === "1";

  if (!name) return fail("Group name is required.", formData);

  const validGroupTypes = [
    "community",
    "school",
    "corporate",
    "council",
    "charity",
    "other",
  ];
  if (!groupType || !validGroupTypes.includes(groupType)) {
    return fail("Please select a group type.", formData);
  }

  const newSlug = slugify(name);
  if (!newSlug)
    return fail(
      "Group name must contain at least one letter or number.",
      formData
    );

  const slugChanged = newSlug !== existing.slug;

  if (slugChanged) {
    const { data: conflict } = await supabase
      .from("groups")
      .select("id")
      .eq("slug", newSlug)
      .neq("id", groupId)
      .maybeSingle();

    if (conflict) {
      return fail(
        `A group with the name "${name}" already exists. Please choose a different name.`,
        formData
      );
    }
  }

  const { error: updateError } = await supabase
    .from("groups")
    .update({
      name,
      slug: newSlug,
      description,
      group_type: groupType,
      website_url: websiteUrl,
      social_url: socialUrl,
      contact_email: contactEmail,
    })
    .eq("id", groupId);

  if (updateError) {
    if (updateError.code === "23505") {
      return fail(
        `A group with the name "${name}" already exists. Please choose a different name.`,
        formData
      );
    }
    return fail("Failed to update group. Please try again.", formData);
  }

  if (removeLogo) {
    await supabase
      .from("groups")
      .update({ logo_url: null })
      .eq("id", groupId);
  } else if (logoFile instanceof File && logoFile.size > 0) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_BYTES = 5 * 1024 * 1024;

    if (allowedTypes.has(logoFile.type) && logoFile.size <= MAX_BYTES) {
      const ext =
        logoFile.name.split(".").pop()?.toLowerCase() ?? "webp";
      const storagePath = `${groupId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("group-logos")
        .upload(storagePath, logoFile, {
          contentType: logoFile.type,
          upsert: true,
        });

      if (!uploadError) {
        const {
          data: { publicUrl: rawPublicUrl },
        } = supabase.storage.from("group-logos").getPublicUrl(storagePath);

        // Append a cache-buster so browsers and Next.js image optimizer
        // don't serve the previous logo from the same URL.
        const publicUrl = `${rawPublicUrl}?t=${Date.now()}`;

        await supabase
          .from("groups")
          .update({ logo_url: publicUrl })
          .eq("id", groupId);
      }
    }
  }

  revalidatePath(`/groups/${newSlug}`);
  if (slugChanged) revalidatePath(`/groups/${existing.slug}`);

  redirect(`/groups/${newSlug}`);
}

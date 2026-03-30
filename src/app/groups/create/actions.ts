"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Convert a name to a URL-safe slug. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Verify the user is a verified organiser
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified_organiser")
    .eq("id", user.id)
    .single();

  if (!profile?.is_verified_organiser) {
    redirect("/become-a-verified-organiser");
  }

  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string).trim() || null;
  const groupType = (formData.get("group_type") as string | null)?.trim() || "";
  const websiteUrl = (formData.get("website_url") as string | null)?.trim() || null;
  const socialUrl = (formData.get("social_url") as string | null)?.trim() || null;
  const contactEmail = (formData.get("contact_email") as string | null)?.trim() || null;
  const logoFile = formData.get("logo") as File | null;

  if (!name) {
    redirect(
      `/groups/create?error=${encodeURIComponent("Group name is required.")}`
    );
  }

  const validGroupTypes = ["community", "school", "corporate", "council", "charity", "other"];
  if (!groupType || !validGroupTypes.includes(groupType)) {
    redirect(
      `/groups/create?error=${encodeURIComponent("Please select a group type.")}`
    );
  }

  const slug = slugify(name);

  if (!slug) {
    redirect(
      `/groups/create?error=${encodeURIComponent(
        "Group name must contain at least one letter or number."
      )}`
    );
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      slug,
      description,
      group_type: groupType,
      website_url: websiteUrl,
      social_url: socialUrl,
      contact_email: contactEmail,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error || !group) {
    if (error?.code === "23505") {
      redirect(
        `/groups/create?error=${encodeURIComponent(
          `A group with the name "${name}" already exists. Please choose a different name.`
        )}`
      );
    }
    redirect(
      `/groups/create?error=${encodeURIComponent(
        "Failed to create group. Please try again."
      )}`
    );
  }

  // Upload logo if provided (non-fatal — group is already created)
  if (logoFile instanceof File && logoFile.size > 0) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

    if (allowedTypes.has(logoFile.type) && logoFile.size <= MAX_BYTES) {
      const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${group.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("group-logos")
        .upload(storagePath, logoFile, { contentType: logoFile.type, upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("group-logos")
          .getPublicUrl(storagePath);

        await supabase.from("groups").update({ logo_url: publicUrl }).eq("id", group.id);
      }
    }
  }

  redirect(`/groups/create?created=${encodeURIComponent(name)}`);
}

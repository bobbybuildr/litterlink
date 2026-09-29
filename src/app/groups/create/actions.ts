"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { geocodePostcode } from "@/lib/geocode";
import { sendGroupCreatedEmail } from "@/lib/email";
import { readFormFields } from "@/lib/input";
import { slugify } from "@/lib/slug";
import { validateImageUpload } from "@/lib/uploads";
import { fail, type FormState } from "@/lib/forms";

const NAME_MAX = 120;
const DESC_MAX = 2000;
const LOCATION_NAME_MAX = 100;

export async function createGroup(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Verify the user is a verified organiser
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified_organiser, display_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_verified_organiser) {
    redirect("/become-a-verified-organiser");
  }

  const input = readFormFields(formData, {
    name: { type: "text", label: "Group name", max: NAME_MAX, required: true },
    description: { type: "multiline", label: "Description", max: DESC_MAX },
    postcode: { type: "postcode", label: "Postcode", required: true },
    location_name: {
      type: "text",
      label: "Display location",
      max: LOCATION_NAME_MAX,
      required: true,
    },
    website_url: { type: "url", label: "Website URL" },
    social_url: { type: "url", label: "Social URL" },
    contact_email: { type: "email", label: "Contact email" },
  });
  if (!input.ok) return fail(input.error, formData);

  const {
    name,
    description,
    postcode,
    location_name: locationName,
    website_url: websiteUrl,
    social_url: socialUrl,
    contact_email: contactEmail,
  } = input.values;
  const groupType = (formData.get("group_type") as string | null)?.trim() || "";
  const logoFile = formData.get("logo") as File | null;

  const validGroupTypes = ["community", "school", "corporate", "council", "charity", "other"];
  if (!groupType || !validGroupTypes.includes(groupType)) {
    return fail("Please select a group type.", formData);
  }

  const slug = slugify(name);

  if (!slug) {
    return fail("Group name must contain at least one letter or number.", formData);
  }

  const geo = await geocodePostcode(postcode);
  if (!geo) {
    return fail(
      `Postcode "${postcode}" wasn't recognised. Please enter a valid UK postcode.`,
      formData
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
      location_postcode: geo.postcode,
      latitude: geo.latitude,
      longitude: geo.longitude,
      location_name: locationName,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error || !group) {
    if (error?.code === "23505") {
      return fail(
        `A group with the name "${name}" already exists. Please choose a different name.`,
        formData
      );
    }
    console.error("[createGroup]", error);
    return fail("Failed to create group. Please try again.", formData);
  }

  // The creator is auto-enrolled as an organiser by the
  // `on_group_created_enrol_organiser` DB trigger (see migration 0032) —
  // a client-side insert here would be silently rejected by the
  // group_members self-insert RLS policy, which only permits role = 'member'.

  // Upload logo if provided (non-fatal — group is already created)
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!validateImageUpload(logoFile)) {
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

  if (user.email) {
    await sendGroupCreatedEmail({
      creatorEmail: user.email,
      creatorName: profile?.display_name ?? null,
      groupName: name,
      groupSlug: group.slug,
    });
  }

  redirect(`/groups/create?created=${encodeURIComponent(name)}`);
}

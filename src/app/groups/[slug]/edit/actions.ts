"use server";

import { redirect } from "next/navigation";
import { withFlash } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodePostcode } from "@/lib/geocode";
import { readFormFields } from "@/lib/input";
import { slugify } from "@/lib/slug";
import { fail, type FormState } from "@/lib/forms";
import { validateImageUpload } from "@/lib/uploads";

const NAME_MAX = 120;
const DESC_MAX = 2000;
const LOCATION_NAME_MAX = 100;

export type EditGroupState = FormState;

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
    .select("created_by, slug, location_postcode, latitude, longitude")
    .eq("id", groupId)
    .single();

  if (fetchError || !existing) return { error: "Group not found." };
  if (existing.created_by !== user.id) return { error: "Not authorised." };

  const input = readFormFields(formData, {
    name: { type: "text", label: "Group name", max: NAME_MAX, required: true },
    description: { type: "multiline", label: "Description", max: DESC_MAX },
    website_url: { type: "url", label: "Website URL" },
    social_url: { type: "url", label: "Social URL" },
    contact_email: { type: "email", label: "Contact email" },
    postcode: { type: "postcode", label: "Postcode", required: true },
    location_name: {
      type: "text",
      label: "Display location",
      max: LOCATION_NAME_MAX,
      required: true,
    },
  });
  if (!input.ok) return fail(input.error, formData);

  const {
    name,
    description,
    website_url: websiteUrl,
    social_url: socialUrl,
    contact_email: contactEmail,
    postcode,
    location_name: locationName,
  } = input.values;
  const groupType = (formData.get("group_type") as string | null)?.trim() ?? "";
  const logoFile = formData.get("logo") as File | null;
  const removeLogo = formData.get("remove_logo") === "1";

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

  // Re-geocode only if the postcode changed
  let lat = existing.latitude;
  let lng = existing.longitude;
  if (postcode !== existing.location_postcode) {
    const geo = await geocodePostcode(postcode);
    if (!geo) {
      return fail(
        `Postcode "${postcode}" wasn't recognised. Please enter a valid UK postcode.`,
        formData
      );
    }
    lat = geo.latitude;
    lng = geo.longitude;
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
      location_postcode: postcode,
      latitude: lat,
      longitude: lng,
      location_name: locationName,
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
    if (!validateImageUpload(logoFile)) {
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

  redirect(withFlash(`/groups/${newSlug}`, "groupUpdated"));
}

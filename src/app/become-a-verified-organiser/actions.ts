"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendApplicationEmails } from "@/lib/email";
import { fail, type FormState } from "@/lib/forms";
import { readFormFields } from "@/lib/input";

export async function submitOrganiserApplication(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const input = readFormFields(formData, {
    motivation: { type: "multiline", label: "Motivation", max: 2000, required: true },
    experience: { type: "multiline", label: "Experience", max: 2000 },
    organisation_name: { type: "text", label: "Organisation name", max: 200 },
    social_links: { type: "text", label: "Social links", max: 500 },
  });
  if (!input.ok) return fail(input.error, formData);

  const {
    motivation,
    experience,
    organisation_name: organisationName,
    social_links: socialLinks,
  } = input.values;

  // Fetch display_name for the confirmation email
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("organiser_applications").insert({
    user_id: user.id,
    motivation,
    experience,
    organisation_name: organisationName,
    social_links: socialLinks,
  });

  if (error) {
    if (error.code === "23505") {
      return fail("You have already submitted an application.", formData);
    }
    console.error("[submitOrganiserApplication]", error);
    return fail("Failed to submit application. Please try again.", formData);
  }

  // Send admin notification + applicant confirmation (non-blocking)
  if (user.email) {
    await sendApplicationEmails({
      applicantEmail: user.email,
      applicantName: profile?.display_name ?? null,
      userId: user.id,
    });
  }

  redirect("/become-a-verified-organiser");
}


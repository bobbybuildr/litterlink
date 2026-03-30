"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendApplicationEmails } from "@/lib/email";

export async function submitOrganiserApplication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const motivation = (formData.get("motivation") as string).trim();
  const experience = (formData.get("experience") as string).trim() || null;
  const organisationName =
    (formData.get("organisation_name") as string).trim() || null;
  const socialLinks = (formData.get("social_links") as string).trim() || null;

  if (!motivation) {
    redirect(
      `/become-a-verified-organiser?error=${encodeURIComponent(
        "Please tell us your motivation for becoming an organiser."
      )}`
    );
  }

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
      redirect(
        `/become-a-verified-organiser?error=${encodeURIComponent(
          "You have already submitted an application."
        )}`
      );
    }
    redirect(
      `/become-a-verified-organiser?error=${encodeURIComponent(
        "Failed to submit application. Please try again."
      )}`
    );
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


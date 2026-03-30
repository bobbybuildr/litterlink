"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendApplicationOutcomeEmail } from "@/lib/email";

async function getAdminOrRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return supabase;
}

export async function approveApplication(applicationId: string) {
  const supabase = await getAdminOrRedirect();

  // Fetch the application to get the user_id
  const { data: application } = await supabase
    .from("organiser_applications")
    .select("user_id, status")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Application not found." };
  if (application.status !== "pending")
    return { error: "Application has already been reviewed." };

  // Update application status
  const { error: appError } = await supabase
    .from("organiser_applications")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (appError) return { error: "Failed to update application." };

  // Grant verified organiser status on the profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_verified_organiser: true })
    .eq("id", application.user_id);

  if (profileError) return { error: "Failed to update profile." };

  // Send outcome email — fetch the applicant's auth details via admin API
  const { data: userData } = await supabase.auth.admin.getUserById(
    application.user_id
  );
  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", application.user_id)
    .single();

  if (userData?.user?.email) {
    await sendApplicationOutcomeEmail({
      applicantEmail: userData.user.email,
      applicantName: profileData?.display_name ?? null,
      outcome: "approved",
    });
  }

  revalidatePath("/admin/applications");
  return { error: null };
}

export async function rejectApplication(applicationId: string) {
  const supabase = await getAdminOrRedirect();

  const { data: application } = await supabase
    .from("organiser_applications")
    .select("user_id, status")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Application not found." };
  if (application.status !== "pending")
    return { error: "Application has already been reviewed." };

  const { error: appError } = await supabase
    .from("organiser_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (appError) return { error: "Failed to update application." };

  // Send outcome email
  const { data: userData } = await supabase.auth.admin.getUserById(
    application.user_id
  );
  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", application.user_id)
    .single();

  if (userData?.user?.email) {
    await sendApplicationOutcomeEmail({
      applicantEmail: userData.user.email,
      applicantName: profileData?.display_name ?? null,
      outcome: "rejected",
    });
  }

  revalidatePath("/admin/applications");
  return { error: null };
}

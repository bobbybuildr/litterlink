import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM ?? "LitterLink <noreply@yourdomain.com>";

/**
 * Send both the admin notification and the applicant confirmation in parallel.
 * Errors are swallowed so a mail failure never blocks the user redirect.
 */
export async function sendApplicationEmails({
  applicantEmail,
  applicantName,
  userId,
}: {
  applicantEmail: string;
  applicantName: string | null;
  userId: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;

  const emails = [];

  if (adminEmail) {
    emails.push(
      resend.emails.send({
        from,
        to: adminEmail,
        subject: "New Verified Organiser Application — LitterLink",
        text: [
          "A new application has been submitted.",
          "",
          `User ID:  ${userId}`,
          `Email:    ${applicantEmail}`,
          `Name:     ${applicantName ?? "(not set)"}`,
          "",
          "Log in to Supabase to review and approve or reject the application.",
        ].join("\n"),
      })
    );
  }

  emails.push(
    resend.emails.send({
      from,
      to: applicantEmail,
      subject: "We've received your application — LitterLink",
      text: [
        `Hi${applicantName ? ` ${applicantName}` : ""},`,
        "",
        "Thanks for applying to become a Verified Organiser on LitterLink.",
        "",
        "We'll review your application and get back to you by email. In the",
        "meantime you can check your application status at any time by visiting:",
        "",
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.app"}/become-a-verified-organiser`,
        "",
        "Thanks,",
        "The LitterLink team",
      ].join("\n"),
    })
  );

  try {
    await Promise.all(emails);
  } catch {
    // Non-fatal — log in production monitoring but don't surface to the user
    console.error("[resend] Failed to send organiser application emails");
  }
}

/**
 * Send an approval or rejection outcome email to an applicant.
 * Errors are swallowed so a mail failure never blocks the admin action.
 */
export async function sendApplicationOutcomeEmail({
  applicantEmail,
  applicantName,
  outcome,
}: {
  applicantEmail: string;
  applicantName: string | null;
  outcome: "approved" | "rejected";
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.app";
  const greeting = `Hi${applicantName ? ` ${applicantName}` : ""},`;

  const body =
    outcome === "approved"
      ? [
          greeting,
          "",
          "Great news — your application to become a Verified Organiser on",
          "LitterLink has been approved! 🎉",
          "",
          "You now have a Verified Organiser badge on all your events and can",
          "create community groups. Get started by creating your first event:",
          "",
          `${siteUrl}/events/create`,
          "",
          "Thanks for helping keep our communities clean.",
          "The LitterLink team",
        ].join("\n")
      : [
          greeting,
          "",
          "Thanks for your interest in becoming a Verified Organiser on LitterLink.",
          "",
          "After reviewing your application, we're unable to approve it at this time.",
          "You're welcome to apply again in the future if your circumstances change.",
          "",
          "If you have any questions, please email hello@litterlink.co.uk.",
          "",
          "Thanks,",
          "The LitterLink team",
        ].join("\n");

  const subject =
    outcome === "approved"
      ? "You're a Verified Organiser on LitterLink! 🎉"
      : "Your LitterLink organiser application";

  try {
    await resend.emails.send({ from, to: applicantEmail, subject, text: body });
  } catch {
    console.error("[resend] Failed to send application outcome email");
  }
}

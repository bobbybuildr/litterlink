import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM ?? "LitterLink <noreply@litterlink.co.uk>";

/**
 * Simple in-process rate limiter for email sends.
 * Keyed by an arbitrary string; returns true if the key is within the cooldown window.
 * Not shared across server instances, but sufficient to prevent button-spam in a single request burst.
 */
const emailRateLimitMap = new Map<string, number>();
const EMAIL_COOLDOWN_MS = 60_000; // 60 seconds

function isEmailRateLimited(key: string): boolean {
  const last = emailRateLimitMap.get(key);
  const now = Date.now();
  if (last !== undefined && now - last < EMAIL_COOLDOWN_MS) {
    return true;
  }
  emailRateLimitMap.set(key, now);
  return false;
}

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
          "Log in to Supabase to review and approve or reject the application:",
          "",
          `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk"}/admin/applications`,
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
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk"}/become-a-verified-organiser`,
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
 * Send a confirmation email to the organiser after they create an event.
 * Errors are swallowed so a mail failure never blocks the user redirect.
 */
export async function sendEventCreatedEmail({
  organiserEmail,
  organiserName,
  eventId,
  title,
  startsAt,
  endsAt,
  addressLabel,
  postcode,
}: {
  organiserEmail: string;
  organiserName: string | null;
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  addressLabel: string | null;
  postcode: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
  const eventUrl = `${siteUrl}/events/${eventId}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    });

  const location = addressLabel ? `${addressLabel} (${postcode})` : postcode;

  const lines = [
    `Hi${organiserName ? ` ${organiserName}` : ""},`,
    "",
    "Your litter-picking event has been created successfully on LitterLink!",
    "",
    `Event:    ${title}`,
    `Date:     ${formatDate(startsAt)}`,
    ...(endsAt ? [`Ends:     ${formatDate(endsAt)}`] : []),
    `Location: ${location}`,
    "",
    "View and manage your event here:",
    "",
    eventUrl,
    "",
    "Thanks for helping keep our communities clean.",
    "The LitterLink team",
  ];

  try {
    await resend.emails.send({
      from,
      to: organiserEmail,
      subject: `Your event "${title}" is live on LitterLink`,
      text: lines.join("\n"),
    });
  } catch {
    console.error("[resend] Failed to send event created email");
  }
}

/**
 * Send a confirmation email when a user joins an event.
 * Rate-limited to one email per user+event per 60 seconds to prevent button-spam.
 */
export async function sendEventJoinedEmail({
  userId,
  userEmail,
  userName,
  eventId,
  title,
  startsAt,
  endsAt,
  addressLabel,
  postcode,
}: {
  userId: string;
  userEmail: string;
  userName: string | null;
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  addressLabel: string | null;
  postcode: string;
}) {
  if (isEmailRateLimited(`join-leave:${userId}:${eventId}`)) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
  const eventUrl = `${siteUrl}/events/${eventId}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    });

  const location = addressLabel ? `${addressLabel} (${postcode})` : postcode;

  const lines = [
    `Hi${userName ? ` ${userName}` : ""},`,
    "",
    `You've joined the litter pick "${title}" on LitterLink!`,
    "",
    `Date:     ${formatDate(startsAt)}`,
    ...(endsAt ? [`Ends:     ${formatDate(endsAt)}`] : []),
    `Location: ${location}`,
    "",
    "View full event details here:",
    "",
    eventUrl,
    "",
    "Thanks for helping keep our communities clean.",
    "The LitterLink team",
  ];

  try {
    await resend.emails.send({
      from,
      to: userEmail,
      subject: `You've joined "${title}" — LitterLink`,
      text: lines.join("\n"),
    });
  } catch {
    console.error("[resend] Failed to send event joined email");
  }
}

/**
 * Send a confirmation email when a user leaves an event they had joined.
 * Rate-limited to one email per user+event per 60 seconds to prevent button-spam.
 */
export async function sendEventLeftEmail({
  userId,
  userEmail,
  userName,
  eventId,
  title,
  startsAt,
}: {
  userId: string;
  userEmail: string;
  userName: string | null;
  eventId: string;
  title: string;
  startsAt: string;
}) {
  if (isEmailRateLimited(`join-leave:${userId}:${eventId}`)) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
  const eventUrl = `${siteUrl}/events/${eventId}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    });

  const lines = [
    `Hi${userName ? ` ${userName}` : ""},`,
    "",
    `You've left the litter pick "${title}" scheduled for ${formatDate(startsAt)}.`,
    "",
    "Changed your mind? You can rejoin at any time:",
    "",
    eventUrl,
    "",
    "Thanks,",
    "The LitterLink team",
  ];

  try {
    await resend.emails.send({
      from,
      to: userEmail,
      subject: `You've left "${title}" — LitterLink`,
      text: lines.join("\n"),
    });
  } catch {
    console.error("[resend] Failed to send event left email");
  }
}

/**
 * Send a cancellation notice to all participants of a cancelled event.
 * Sent in parallel; errors are swallowed so a mail failure never blocks the action.
 */
export async function sendEventCancelledEmails({
  participants,
  eventId,
  title,
  startsAt,
}: {
  participants: { email: string; name: string | null }[];
  eventId: string;
  title: string;
  startsAt: string;
}) {
  if (!participants.length) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
  const eventsUrl = `${siteUrl}/events`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    });

  const sends = participants.map(({ email, name }) => {
    const lines = [
      `Hi${name ? ` ${name}` : ""},`,
      "",
      `We're sorry to let you know that the litter pick "${title}" scheduled`,
      `for ${formatDate(startsAt)} has been cancelled by the organiser.`,
      "",
      "Browse other upcoming events near you:",
      "",
      eventsUrl,
      "",
      "Thanks for your interest in keeping our communities clean.",
      "The LitterLink team",
    ];

    return resend.emails.send({
      from,
      to: email,
      subject: `"${title}" has been cancelled — LitterLink`,
      text: lines.join("\n"),
    });
  });

  try {
    await Promise.all(sends);
  } catch {
    console.error("[resend] Failed to send one or more event cancellation emails");
  }
}

/**
 * Notify confirmed participants that an event's date or time has changed.
 * Sent in parallel; errors are swallowed so a mail failure never blocks the action.
 */
export async function sendEventUpdatedEmails({
  participants,
  eventId,
  title,
  startsAt,
  endsAt,
  addressLabel,
  postcode,
  dateTimeChanged,
  locationChanged,
}: {
  participants: { email: string; name: string | null }[];
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  addressLabel: string | null;
  postcode: string;
  dateTimeChanged: boolean;
  locationChanged: boolean;
}) {
  if (!participants.length) return;

  // In-process guard — catches same-instance burst spam cheaply.
  // The DB-backed cooldown in the action is the authoritative cross-instance check.
  if (isEmailRateLimited(`event_reschedule:${eventId}`)) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
  const eventUrl = `${siteUrl}/events/${eventId}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    });

  const location = addressLabel ? `${addressLabel} (${postcode})` : postcode;

  const whatChanged =
    dateTimeChanged && locationChanged
      ? "date, time, and location"
      : dateTimeChanged
      ? "date or time"
      : "location";

  const subject =
    dateTimeChanged && locationChanged
      ? `"${title}" has been rescheduled and moved — LitterLink`
      : dateTimeChanged
      ? `"${title}" has been rescheduled — LitterLink`
      : `"${title}" has a new location — LitterLink`;

  const sends = participants.map(({ email, name }) => {
    const lines = [
      `Hi${name ? ` ${name}` : ""},`,
      "",
      `The ${whatChanged} for the litter pick "${title}" has been updated by the organiser.`,
      "",
      ...(dateTimeChanged
        ? [
            `New date:  ${formatDate(startsAt)}`,
            ...(endsAt ? [`Ends:      ${formatDate(endsAt)}`] : []),
          ]
        : []),
      ...(locationChanged ? [`Location:  ${location}`] : []),
      "",
      "View the updated event details here:",
      "",
      eventUrl,
      "",
      "Thanks,",
      "The LitterLink team",
    ];

    return resend.emails.send({
      from,
      to: email,
      subject,
      text: lines.join("\n"),
    });
  });

  try {
    await Promise.all(sends);
  } catch {
    console.error("[resend] Failed to send one or more event updated emails");
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
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

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationForm } from "./ApplicationForm";
import type { OrganiserApplicationRow } from "@/lib/events";
import { BadgeCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Become a Verified Organiser",
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

const statusMessages: Record<
  OrganiserApplicationRow["status"],
  { heading: string; body: string; colour: string }
> = {
  pending: {
    heading: "Application under review",
    body: "Thanks for applying! We'll review your application and get back to you by email.",
    colour: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  approved: {
    heading: "You're a Verified Organiser!",
    body: "Your application has been approved. You can now create events and groups.",
    colour: "bg-green-50 border-green-200 text-green-800",
  },
  rejected: {
    heading: "Application not approved",
    body: "Unfortunately your application was not approved at this time. You may contact us for more information.",
    colour: "bg-red-50 border-red-200 text-red-800",
  },
};

export default async function BecomeAnOrganiserPage({ searchParams }: Props) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/become-a-verified-organiser");

  // Check if the user is already a verified organiser
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified_organiser")
    .eq("id", user.id)
    .single();

  if (profile?.is_verified_organiser) {
    redirect("/events/create");
  }

  // Check for an existing application
  const { data: application } = await supabase
    .from("organiser_applications")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const existingApp = application as OrganiserApplicationRow | null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
          Become a Verified Organiser <BadgeCheck className="h-6 w-6 text-brand" aria-label="Verified Organiser" />
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Verified organisers get a trust badge on all their events, helping
          participants feel confident about who they&apos;re joining. You&apos;ll
          also be able to create community groups and affiliate multiple events
          under one identity. Anyone can create events — but verification shows
          you&apos;re serious.
        </p>
      </div>

      {existingApp ? (
        <div
          className={`rounded-lg border px-5 py-4 ${statusMessages[existingApp.status].colour}`}
        >
          <p className="font-semibold">
            {statusMessages[existingApp.status].heading}
          </p>
          <p className="mt-1 text-sm">
            {statusMessages[existingApp.status].body}
          </p>
          {existingApp.status === "approved" && (
            <a
              href="/events/create"
              className="mt-3 inline-block rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
            >
              Create an event
            </a>
          )}
        </div>
      ) : (
        <ApplicationForm error={error} />
      )}
    </div>
  );
}

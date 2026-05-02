import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { DeleteAccountSection } from "./DeleteAccountSection";

export const metadata: Metadata = {
  title: "Your Profile — LitterLink",
  description: "Update your display name, location, and profile photo.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, postcode, avatar_url, username, bio, social_url")
    .eq("id", user.id)
    .single();

  const { data: emailPrefs } = await supabase
    .from("email_preferences")
    .select("event_notifications, organiser_status_updates, new_nearby_events, marketing_emails, newsletter")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Your profile</h1>
      <p className="mb-8 text-sm text-gray-500">
        Update your display name, location, and profile photo.
      </p>
      <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <span>←</span> Return to dashboard
      </Link>
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <ProfileForm
          displayName={profile?.display_name ?? null}
          postcode={profile?.postcode ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          email={user.email ?? ""}
          username={profile?.username ?? null}
          bio={profile?.bio ?? null}
          socialUrl={profile?.social_url ?? null}
          profileId={user.id}
          emailPrefs={{
            event_notifications: emailPrefs?.event_notifications ?? true,
            organiser_status_updates: emailPrefs?.organiser_status_updates ?? true,
            new_nearby_events: emailPrefs?.new_nearby_events ?? false,
            marketing_emails: emailPrefs?.marketing_emails ?? false,
            newsletter: emailPrefs?.newsletter ?? false,
          }}
        />
      </div>
      <DeleteAccountSection />
    </main>
  );
}

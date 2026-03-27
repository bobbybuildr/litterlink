import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

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
    .select("display_name, postcode, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Your profile</h1>
      <p className="mb-8 text-sm text-gray-500">
        Update your display name, location, and profile photo.
      </p>
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <ProfileForm
          displayName={profile?.display_name ?? null}
          postcode={profile?.postcode ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          email={user.email ?? ""}
        />
      </div>
    </main>
  );
}

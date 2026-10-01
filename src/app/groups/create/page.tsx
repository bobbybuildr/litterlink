import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "./CreateGroupForm";

export const metadata: Metadata = {
  title: "Create a Group",
};

export default async function CreateGroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/groups/create");

  // Gate: only verified organisers
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified_organiser")
    .eq("id", user.id)
    .single();

  if (!profile?.is_verified_organiser) {
    redirect("/become-a-verified-organiser");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create a group</h1>
        <p className="mt-1 text-sm text-gray-500">
          Groups let you affiliate multiple events under one community identity.
        </p>
      </div>

      <CreateGroupForm />
    </div>
  );
}

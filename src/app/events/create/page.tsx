import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateEventForm } from "./CreateEventForm";
import type { GroupRow } from "@/lib/events";
import { utcToLondonDatetimeLocal } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create a Litter Pick",
};

export default async function CreateEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?redirectTo=/events/create");

  // Check if the user is a verified organiser
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified_organiser")
    .eq("id", user.id)
    .single();

  const isVerifiedOrganiser = profile?.is_verified_organiser ?? false;

  // Fetch groups owned by the current user (only verified organisers can have groups)
  const { data: groupsRaw } = isVerifiedOrganiser
    ? await supabase
        .from("groups")
        .select("id, name, slug")
        .eq("created_by", user.id)
        .order("name", { ascending: true })
    : { data: null };

  const groups = (groupsRaw ?? []) as Pick<GroupRow, "id" | "name" | "slug">[];

  // Set min datetime to now (rounded up to next minute) expressed in London local time
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + 1);
  const minDatetime = utcToLondonDatetimeLocal(now.toISOString());

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create a litter pick</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details and your event will be published immediately.
        </p>
      </div>

      <CreateEventForm
        isVerifiedOrganiser={isVerifiedOrganiser}
        groups={groups}
        minDatetime={minDatetime}
      />
    </div>
  );
}

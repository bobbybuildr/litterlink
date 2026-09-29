import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "./CreateGroupForm";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Create a Group",
};

interface Props {
  searchParams: Promise<{ created?: string }>;
}

export default async function CreateGroupPage({ searchParams }: Props) {
  const { created } = await searchParams;

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

  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
          <h1 className="text-xl font-bold text-gray-900">
            &ldquo;{created}&rdquo; created successfully!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your group is ready. You can now create events under this group, or head back to your
            dashboard.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/events/create"
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              Create an event
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
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

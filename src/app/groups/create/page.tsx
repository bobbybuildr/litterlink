import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroup } from "./actions";
import { GroupSubmitButton } from "./GroupSubmitButton";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Create a Group",
};

interface Props {
  searchParams: Promise<{ error?: string; created?: string }>;
}

export default async function CreateGroupPage({ searchParams }: Props) {
  const { error, created } = await searchParams;

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

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={createGroup} className="space-y-6">
        <Field label="Group name *" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Riverside Clean-Up Crew"
            className={inputCls}
          />
        </Field>

        <Field label="Group type *" htmlFor="group_type">
          <select id="group_type" name="group_type" required className={inputCls}>
            <option value="">Select a group type…</option>
            <option value="community">Community</option>
            <option value="school">School</option>
            <option value="corporate">Corporate</option>
            <option value="council">Council</option>
            <option value="charity">Charity</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Description" htmlFor="description" hint="Optional">
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={2000}
            placeholder="What is your group about? Who can join?"
            className={inputCls}
          />
        </Field>

        <Field label="Group logo" htmlFor="logo" hint="Optional · JPEG, PNG or WebP · max 5 MB">
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
          />
        </Field>

        <Field label="Website URL" htmlFor="website_url" hint="Optional">
          <input
            id="website_url"
            name="website_url"
            type="url"
            maxLength={500}
            placeholder="https://example.com"
            className={inputCls}
          />
        </Field>

        <Field label="Primary social media page" htmlFor="social_url" hint="Optional">
          <input
            id="social_url"
            name="social_url"
            type="url"
            maxLength={500}
            placeholder="https://facebook.com/your-group"
            className={inputCls}
          />
        </Field>

        <Field label="Contact email" htmlFor="contact_email" hint="Optional">
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            maxLength={254}
            placeholder="hello@yourgroup.org"
            className={inputCls}
          />
        </Field>

        <div className="flex items-center gap-4 pt-2">
          <GroupSubmitButton />
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {hint && (
          <span className="ml-1 font-normal text-gray-400">({hint})</span>
        )}
      </label>
      {children}
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGroupBySlug } from "@/lib/events";
import { EditGroupForm } from "./EditGroupForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Edit group",
};

export default async function EditGroupPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?redirectTo=/groups/${slug}/edit`);

  const group = await getGroupBySlug(slug);
  if (!group) notFound();
  if (group.created_by !== user.id) notFound();

  const defaultValues = {
    name: group.name,
    description: group.description ?? "",
    group_type: group.group_type,
    website_url: group.website_url ?? "",
    social_url: group.social_url ?? "",
    contact_email: group.contact_email ?? "",
    postcode: group.location_postcode ?? "",
    location_name: group.location_name ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/groups/${slug}`}
        className="mb-6 flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to group
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit group</h1>
        <p className="mt-1 text-sm text-gray-500">
          Changes are published immediately.
        </p>
      </div>

      <EditGroupForm
        groupId={group.id}
        currentLogoUrl={group.logo_url}
        defaultValues={defaultValues}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditEventForm } from "./EditEventForm";
import { utcToLondonDatetimeLocal } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit event",
};

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?redirectTo=/events/${id}/edit`);

  const { data: event } = await supabase
    .from("events")
    .select(
      "organiser_id, status, title, description, location_postcode, address_label, starts_at, ends_at, max_attendees, organiser_contact_details, updated_at"
    )
    .eq("id", id)
    .single();

  if (!event) notFound();
  if (event.organiser_id !== user.id) notFound();
  if (
    event.status === "completed" ||
    event.status === "cancelled" ||
    new Date(event.starts_at) <= new Date()
  ) {
    redirect(`/events/${id}`);
  }

  const defaultValues = {
    title: event.title,
    description: event.description ?? "",
    postcode: event.location_postcode,
    address_label: event.address_label ?? "",
    starts_at: utcToLondonDatetimeLocal(event.starts_at),
    ends_at: event.ends_at ? utcToLondonDatetimeLocal(event.ends_at) : "",
    max_attendees: event.max_attendees?.toString() ?? "",
    organiser_contact_details: event.organiser_contact_details ?? "",
  };

  const formattedUpdatedAt = event.updated_at
    ? new Date(event.updated_at).toLocaleString("en-GB", {
        timeZone: "Europe/London",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Min datetime for the date inputs — now rounded up to next minute
  const nowRounded = new Date();
  nowRounded.setSeconds(0, 0);
  nowRounded.setMinutes(nowRounded.getMinutes() + 1);
  const minDatetime = utcToLondonDatetimeLocal(nowRounded.toISOString());

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/events/${id}`}
        className="mb-6 flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit event</h1>
          <p className="mt-1 text-sm text-gray-500">
            Changes are published immediately.
          </p>
        </div>
        {formattedUpdatedAt && (
          <p className="text-xs text-gray-400">
            Last updated: {formattedUpdatedAt}
          </p>
        )}
      </div>

      <EditEventForm eventId={id} minDatetime={minDatetime} defaultValues={defaultValues} />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatsForm } from "./StatsForm";

export const metadata: Metadata = { title: "Log Impact Stats" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StatsPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?redirectTo=/events/${id}/stats`);

  const { data: event } = await supabase
    .from("events")
    .select("id, title, organiser_id, status, starts_at")
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Only the organiser can log stats
  if (event.organiser_id !== user.id) notFound();

  // Cancelled events cannot accept new or edited stats
  if (event.status === "cancelled") redirect(`/events/${id}`);

  // Can only log stats after the event has started
  if (new Date(event.starts_at) > new Date()) redirect(`/events/${id}`);

  const { data: existingStats } = await supabase
    .from("event_stats")
    .select(
      "bags_collected, actual_attendees, duration_hours, litter_types, hotspot_severity, notable_brands, notes"
    )
    .eq("event_id", id)
    .maybeSingle();

  const isEditing = !!existingStats;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Link
        href={`/events/${id}`}
        className="mb-6 flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "Edit impact stats" : "Log impact stats"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{event.title}</p>
      </div>

      <div className="mb-8">
        <p className="mt-1 text-sm text-gray-500">LitterLink relies on honest reporting. Impact data helps communities and potential sponsors understand real-world change.</p>
      </div>

      <StatsForm eventId={id} existingStats={existingStats} />
    </div>
  );
}

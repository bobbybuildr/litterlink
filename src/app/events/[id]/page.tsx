import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Calendar, User, ArrowLeft, Package, Weight } from "lucide-react";
import { getEventById, getUserParticipation } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { JoinButton } from "@/components/events/JoinButton";
import { ShareUrl } from "@/components/events/ShareUrl";
import { EventsMap } from "@/components/map/EventsMap";
import { cancelEvent } from "@/app/events/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.description ?? `Join the litter pick at ${event.address_label ?? event.location_postcode}`,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;

  const [event, supabase] = await Promise.all([
    getEventById(id),
    createClient(),
  ]);

  if (!event) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const participationStatus = user
    ? await getUserParticipation(id, user.id)
    : null;

  const isPast = new Date(event.starts_at) < new Date();
  const isCompleted = event.status === "completed";
  const isCancelled = event.status === "cancelled";
  const isOrganiser = user?.id === event.organiser_id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/events"
        className="mb-6 flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All events
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + status */}
          <div>
            {isCompleted && (
              <span className="mb-2 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                Completed
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            {event.organiser_name && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <User className="h-3.5 w-3.5" />
                Organised by {event.organiser_name}
              </p>
            )}
          </div>

          {/* Key info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <InfoRow icon={<Calendar className="h-4 w-4 text-brand" />}>
              <span className="font-medium">{formatDate(event.starts_at)}</span>
              {event.ends_at && (
                <span className="text-gray-500"> – {formatTime(event.ends_at)}</span>
              )}
            </InfoRow>
            <InfoRow icon={<MapPin className="h-4 w-4 text-brand" />}>
              {event.address_label && (
                <span className="font-medium">{event.address_label}</span>
              )}
              <span className="text-gray-500 ml-1">{event.location_postcode}</span>
            </InfoRow>
          </div>

          {/* Description */}
          {event.description && (
            <div className="prose prose-sm max-w-none text-gray-700 rounded-xl border border-gray-200 bg-white p-5">
              <p className="whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Post-event stats */}
          {isCompleted && event.event_stats && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h2 className="mb-4 font-semibold text-green-900">Impact stats</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {event.event_stats.bags_collected != null && (
                  <StatTile
                    icon={<Package className="h-5 w-5 text-green-600" />}
                    value={event.event_stats.bags_collected}
                    label="Bags"
                  />
                )}
                {event.event_stats.weight_kg != null && (
                  <StatTile
                    icon={<Weight className="h-5 w-5 text-green-600" />}
                    value={`${event.event_stats.weight_kg} kg`}
                    label="Litter"
                  />
                )}
                {event.event_stats.actual_attendees != null && (
                  <StatTile
                    icon={<span className="text-lg">👥</span>}
                    value={event.event_stats.actual_attendees}
                    label="Attended"
                  />
                )}
                {event.event_stats.area_covered_sqm != null && (
                  <StatTile
                    icon={<span className="text-lg">📐</span>}
                    value={`${event.event_stats.area_covered_sqm} m²`}
                    label="Area"
                  />
                )}
              </div>
              {event.event_stats.notes && (
                <p className="mt-3 text-sm text-green-800 italic">&ldquo;{event.event_stats.notes}&rdquo;</p>
              )}
            </div>
          )}

          {/* Organiser: log stats CTA */}
          {isOrganiser && !isCompleted && !isPast && (
            <p className="text-sm text-gray-500">
              After the event, come back here to{" "}
              <Link href={`/events/${id}/stats`} className="text-brand hover:underline font-medium">
                log your impact stats
              </Link>
              .
            </p>
          )}

          {/* Organiser: cancel event */}
          {isOrganiser && !isCompleted && !isCancelled && (
            <form
              action={async () => {
                "use server";
                await cancelEvent(id);
              }}
            >
              <FormSubmitButton
                pendingText="Cancelling…"
                className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline transition-colors"
              >
                Cancel this event
              </FormSubmitButton>
            </form>
          )}

          {/* Cancelled banner */}
          {isCancelled && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">This event has been cancelled.</p>
            </div>
          )}
          {isOrganiser && (isPast || isCompleted) && !event.event_stats && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Log your impact</p>
              <p className="mt-1 text-sm text-amber-700">This event has passed. Add bags collected, weight, and attendance.</p>
              <Link
                href={`/events/${id}/stats`}
                className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
              >
                Log stats →
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* RSVP */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <JoinButton
              eventId={id}
              initialCount={event.confirmed_count}
              initialStatus={participationStatus}
              isAuthenticated={!!user}
              isPast={isPast || isCompleted}
            />
            {event.max_attendees != null && (
              <p className="mt-2 text-xs text-gray-400">
                {event.max_attendees - event.confirmed_count} spots remaining
              </p>
            )}
          </div>

          {/* Mini map */}
          <div className="h-48 overflow-hidden rounded-xl border border-gray-200">
            <EventsMap
              events={[event]}
              centerLat={event.latitude}
              centerLng={event.longitude}
            />
          </div>

          {/* Share */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Share this event</p>
            <ShareUrl />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-white p-3 text-center shadow-sm">
      {icon}
      <p className="mt-1 text-lg font-bold text-green-900">{value}</p>
      <p className="text-xs text-green-700">{label}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Calendars,
  User,
  Users,
  ArrowLeft,
  Trash,
  Weight,
  Clock,
  CheckCircle,
  XCircle,
  BadgeCheck,
  Sparkles
} from "lucide-react";
import { getEventById, getUserParticipation, getEventPhotos, getEventParticipants } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { JoinButton } from "@/components/events/JoinButton";
import { ShareUrl } from "@/components/events/ShareUrl";
import { EventsMap } from "@/components/map/EventsMap";
import { cancelEvent } from "@/app/events/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { CancelEventButton } from "@/components/events/CancelEventButton";
import { EventPhotosGallery } from "@/components/events/EventPhotosGallery";
import { PhotoUpload } from "@/components/events/PhotoUpload";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Event not found" };
  const description =
    event.description ?? `Join the litter pick at ${event.address_label ?? event.location_postcode}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      url: `${siteUrl}/events/${id}`,
      type: "website",
      siteName: "LitterLink",
    },
  };
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { updated } = await searchParams;

  const [event, supabase] = await Promise.all([
    getEventById(id),
    createClient(),
  ]);

  if (!event) notFound();

  const isCompleted = event.status === "completed";
  const isCancelled = event.status === "cancelled";
  const isFull =
    event.max_attendees != null &&
    event.confirmed_count >= event.max_attendees;

  const [{ data: { user } }, photos, participants] = await Promise.all([
    supabase.auth.getUser(),
    isCompleted ? getEventPhotos(id) : Promise.resolve([] as Awaited<ReturnType<typeof getEventPhotos>>),
    getEventParticipants(id),
  ]);

  const participationStatus = user
    ? await getUserParticipation(id, user.id)
    : null;

  const photoData = photos.map((p) => ({
    id: p.id,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${p.storage_path}`,
  }));

  const isPast = new Date(event.starts_at) < new Date();
  const isNew = Date.now() - new Date(event.created_at).getTime() < 48 * 60 * 60 * 1000;
  const isOrganiser = user?.id === event.organiser_id;
  const needsWrapUp = isOrganiser && isPast && !isCompleted && !isCancelled;

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

      {updated === "1" && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Event updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + status */}
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {!isCancelled && !isCompleted && !isPast && isNew && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <Sparkles className="h-3 w-3" />
                  Newly created
                </span>
              )}
              {!isCancelled && !isCompleted && !isPast && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  <Calendar className="h-3 w-3" />
                  Upcoming
                </span>
              )}
              {isCancelled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  <XCircle className="h-3 w-3" />
                  Cancelled
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </span>
              )}
              {isPast && !isCompleted && !isCancelled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  <Clock className="h-3 w-3" />
                  Past event
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            {event.organiser_name && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <User className="h-3.5 w-3.5" />
                Organised by <span className="font-semibold">{event.organiser_name}</span>
                {event.organiser_is_verified && (
                  <BadgeCheck className="h-4 w-4 text-brand" aria-label="Verified Organiser" />
                )}
              </p>
            )}
            {event.group_name && event.group_slug && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="h-3.5 w-3.5" />
                On behalf of{" "}
                <Link href={`/groups/${event.group_slug}`} className="font-medium text-brand hover:underline">
                  {event.group_name}
                </Link>
              </p>
            )}
          </div>

          {event.organiser_is_verified && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
              <BadgeCheck className="h-5 w-5 shrink-0 text-brand" />
              <p className="text-sm font-medium text-brand">
                <span className="font-semibold">{event.organiser_name}</span>&nbsp;is a Verified Organiser — Verified Organisers have a proven record of organising events. This helps
          participants feel confident about who they&apos;re joining.
              </p>
            </div>
          )}

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

          {/* Organiser contact details */}
          {event.organiser_contact_details && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Organiser contact details</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{event.organiser_contact_details}</p>
            </div>
          )}

          {/* Post-event stats */}
          {isCompleted && event.event_stats && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h2 className="mb-4 font-semibold text-green-900">Impact stats</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {event.event_stats.bags_collected != null && (
                  <StatTile
                    icon={<Trash className="h-5 w-5 text-green-600" />}
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
                    icon={<Users className="h-5 w-5 text-purple-600" />}
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
              {event.event_stats.notes != null && (
                <p className="mt-3 text-sm text-green-800">Organiser message:&nbsp;<span className="italic">&ldquo;{event.event_stats.notes}&rdquo;</span></p>
              )}
              {/* Hotspot severity */}
              {event.event_stats.hotspot_severity != null && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-green-800 mb-1.5">Hotspot severity</p>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`h-2 flex-1 rounded-full ${
                          n <= event.event_stats!.hotspot_severity!
                            ? "bg-green-500"
                            : "bg-green-200"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-green-700 whitespace-nowrap">
                      {["Light", "Mild", "Moderate", "Heavy", "Very heavy"][event.event_stats.hotspot_severity - 1]}
                    </span>
                  </div>
                </div>
              )}

              {/* Litter types */}
              {event.event_stats.litter_types && event.event_stats.litter_types.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-green-800 mb-1.5">Litter found</p>
                  <div className="flex flex-wrap gap-1.5">
                    {event.event_stats.litter_types.map((type) => (
                      <span
                        key={type}
                        className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notable brands */}
              {event.event_stats.notable_brands != null && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-green-800 mb-1">Notable brands</p>
                  <p className="text-sm text-green-700">{event.event_stats.notable_brands}</p>
                </div>
              )}
            </div>
          )}

          {/* Event photos gallery */}
          {isCompleted && <EventPhotosGallery photos={photoData} isOrganiser={isOrganiser} />}

          {/* Organiser: upload photos */}
          {isOrganiser && isCompleted && (
            <PhotoUpload eventId={id} />
          )}
          {/* Participants */}
          {participants.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" />
                {isPast ? "Who took part" : "Who\u2019s taking part"} ({participants.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {participants.map((p, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-gray-800">
                      {p.profiles?.display_name ?? "Anonymous"}
                      {p.profiles?.display_name === event.organiser_name && (
                        <span className="ml-1 font-normal text-gray-400">(organiser)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">
                      Joined {new Date(p.joined_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}


          {/* Organiser: log stats CTA */}
          {isOrganiser && !isCompleted && !isPast && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
            <p className="text-sm text-gray-500">
              💡 After the event, come back here to log your impact stats and add photos.
            </p>
            </div>
          )}

          {/* Cancelled banner */}
          {isCancelled && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">This event has been cancelled.</p>
            </div>
          )}
          {needsWrapUp && !event.event_stats && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Needs wrap-up</p>
              <p className="mt-1 text-sm text-amber-700">This event has passed. Add bags collected, duration, attendance, and litter information to mark it complete.</p>
              <Link
                href={`/events/${id}/stats`}
                className="mt-3 me-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
              >
                Log stats →
              </Link>
              <CancelEventButton action={async () => { "use server"; await cancelEvent(id); }} />
            </div>
          )}

          {/* Organiser: edit event */}
          {isOrganiser && !isCompleted && !isCancelled && !isPast && (
            <Link href={`/events/${id}/edit`} className="me-4 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors">
              Edit this event
            </Link>
          )}

          {/* Organiser: duplicate event */}
          {isOrganiser && !isCompleted && !isCancelled && !isPast && (
            <Link href={`/events/create?origId=${id}`} className="me-4 text-sm font-medium text-green-600 hover:text-green-700 hover:underline transition-colors">
              Duplicate this event
            </Link>
          )}
          {isOrganiser && (isCompleted || isCancelled || isPast) && (
            <Link href={`/events/create?origId=${id}`} className="inline-flex gap-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark transition-colors">
              <Calendars className="inline w-4 h-4" /> Duplicate this event
            </Link>
          )}

          {/* Organiser: cancel event */}
          {isOrganiser && !isCompleted && !isCancelled && !isPast && (
            <CancelEventButton action={async () => { "use server"; await cancelEvent(id); }} />
          )}

          {isPast && !isCompleted && !isCancelled && !isOrganiser && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">This event has finished.</p>
              <p className="mt-1 text-sm text-gray-500">Check back later for impact updates from the organiser.</p>
            </div>
          )}
          {event.created_at && (
                <p className="pt-1 -mb-1 text-xs text-gray-400">
                  Event created:{" "}
                  {new Date(event.created_at).toLocaleString("en-GB", {
                    timeZone: "Europe/London",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
          {event.content_updated_at && (
                <p className="pt-1 text-xs text-gray-400">
                  Last updated:{" "}
                  {new Date(event.content_updated_at).toLocaleString("en-GB", {
                    timeZone: "Europe/London",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
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
              isCancelled={isCancelled}
              isFull={isFull}
              eventTitle={event.title}
              startsAt={event.starts_at}
              endsAt={event.ends_at ?? null}
              location={event.address_label ?? event.location_postcode}
            />
            {event.max_attendees != null && (
              <p className="mt-2 text-xs text-gray-400 text-center">
                {isFull
                  ? "No spots remaining"
                  : (() => {
                      const remaining = Math.max(0, event.max_attendees - event.confirmed_count);
                      return `${remaining} spot${remaining !== 1 ? "s" : ""} remaining`;
                    })()}
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
            <p className="text-xs font-medium text-gray-500 mb-2">Invite others to join</p>
            <ShareUrl title={event.title} />
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
    timeZone: "Europe/London",
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
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
}

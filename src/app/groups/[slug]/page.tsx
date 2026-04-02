import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Globe, Share2, Mail, Users, Calendar } from "lucide-react";
import { getGroupBySlug, getEventsByGroupId } from "@/lib/events";
import { EventCard } from "@/components/events/EventCard";

interface Props {
  params: Promise<{ slug: string }>;
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  community: "Community group",
  school: "School",
  corporate: "Corporate",
  council: "Council",
  charity: "Charity",
  other: "Organisation",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) return { title: "Group not found" };
  return {
    title: group.name,
    description: group.description ?? `Events organised by ${group.name}`,
  };
}

export default async function GroupPage({ params }: Props) {
  const { slug } = await params;

  const group = await getGroupBySlug(slug);
  if (!group) notFound();

  const events = await getEventsByGroupId(group.id);

  const now = new Date();
  const upcoming = events.filter(
    (e) => e.status === "published" && new Date(e.starts_at) >= now
  );
  const past = events.filter(
    (e) => e.status === "completed" || (e.status !== "cancelled" && new Date(e.starts_at) < now) || e.status === "cancelled"
  );

  const typeLabel = GROUP_TYPE_LABELS[group.group_type] ?? "Organisation";
  const hasLinks = group.website_url || group.social_url || group.contact_email;

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

      {/* Group header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <div className="flex items-start gap-5">
          {group.logo_url ? (
            <div className="shrink-0">
              <Image
                src={group.logo_url}
                alt={`${group.name} logo`}
                width={72}
                height={72}
                className="rounded-xl object-cover border border-gray-100"
              />
            </div>
          ) : (
            <div className="shrink-0 flex h-18 w-18 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
              <Users className="h-8 w-8 text-brand" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {typeLabel}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {group.description}
              </p>
            )}
          </div>
        </div>

        {/* Links */}
        {hasLinks && (
          <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5">
            {group.website_url && (
              <a
                href={group.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                {group.website_url}
              </a>
            )}
            {group.social_url && (
              <a
                href={group.social_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                {group.social_url}
              </a>
            )}
            {group.contact_email && (
              <a
                href={`mailto:${group.contact_email}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {group.contact_email}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p className="font-medium text-gray-700">No events yet</p>
          <p className="mt-1 text-sm text-gray-500">
            {group.name}&nbsp;hasn&apos;t published any events yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand" />
                Upcoming events ({upcoming.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Past events ({past.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Globe, Share2, Mail, Users, Calendar, Pencil, ShieldCheck, MapPin } from "lucide-react";
import { getGroupBySlug, getEventsByGroupId, getGroupMembers } from "@/lib/events";
import { EventCard } from "@/components/events/EventCard";
import { JoinGroupButton } from "@/components/groups/JoinGroupButton";
import { createClient } from "@/lib/supabase/server";

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

  const [group, supabase] = await Promise.all([
    getGroupBySlug(slug),
    createClient(),
  ]);
  if (!group) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user && user.id === group.created_by;

  const [events, members] = await Promise.all([
    getEventsByGroupId(group.id),
    getGroupMembers(group.id),
  ]);

  const isMember = !!user && members.some((m) => m.user_id === user.id);
  const organisers = members.filter((m) => m.role === "organiser");
  const regularMembers = members.filter((m) => m.role === "member");

  const now = new Date();
  const upcoming = events.filter(
    (e) => e.status === "published" && new Date(e.starts_at) >= now
  );
  const past = events.filter(
    (e) => e.status === "completed" || (e.status !== "cancelled" && new Date(e.starts_at) < now) || e.status === "cancelled"
  );

  const typeLabel = GROUP_TYPE_LABELS[group.group_type] ?? "Organisation";
  const hasLinks = group.website_url || group.social_url || group.contact_email;
  const locationLabel = group.location_name || group.location_postcode;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back + Edit */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/events"
          className="flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All events
        </Link>
        {isOwner && (
          <Link
            href={`/groups/${slug}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit group
          </Link>
        )}
      </div>

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
            {locationLabel && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                {locationLabel}
              </p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {/* Join / Leave */}
        {!isOwner && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <JoinGroupButton
              groupId={group.id}
              groupSlug={slug}
              initialIsMember={isMember}
              isAuthenticated={!!user}
            />
          </div>
        )}

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

      {/* Organisers & Members */}
      {members.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8 space-y-6">
          {organisers.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <ShieldCheck className="h-4 w-4" />
                Group Creator
              </h2>
              <ul className="flex flex-wrap gap-3">
                {organisers.map((m) => (
                  <li key={m.user_id}>
                    <MemberChip member={m} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {regularMembers.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <Users className="h-4 w-4" />
                Group Members
              </h2>
              <ul className="flex flex-wrap gap-3">
                {regularMembers.map((m) => (
                  <li key={m.user_id}>
                    <MemberChip member={m} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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

import type { GroupMember } from "@/lib/events";

function MemberChip({ member }: { member: GroupMember }) {
  const name = member.display_name ?? member.username ?? "Member";
  const inner = (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-1 pr-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
      {member.avatar_url ? (
        <Image
          src={member.avatar_url}
          alt={name}
          width={24}
          height={24}
          className="rounded-full object-cover"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-medium text-brand">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      {name}
    </div>
  );

  if (member.username) {
    return <Link href={`/profile/${member.username}`}>{inner}</Link>;
  }
  return inner;
}

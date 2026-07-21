import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Globe, Mail, Users, Calendar, Pencil, ShieldCheck, MapPin, Trash, Clock } from "lucide-react";
import { getGroupBySlug, getEventsByGroupId, getGroupMembers } from "@/lib/events";
import { GROUP_TYPE_LABELS } from "@/lib/constants";
import { EventCard } from "@/components/events/EventCard";
import { JoinGroupButton } from "@/components/groups/JoinGroupButton";
import { DeleteGroupButton } from "@/components/groups/DeleteGroupButton";
import { GroupsMap } from "@/components/map/GroupsMap";
import { ShareGroupButton } from "@/components/groups/ShareGroupButton";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

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

  let isAdmin = false;
  if (user && !isOwner) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!profile?.is_admin;
  }

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

  // Impact stats — aggregated from event_stats for this group's completed events
  const completedEvents = events.filter((e) => e.status === "completed");
  const { data: statsRows } = completedEvents.length
    ? await supabase
        .from("event_stats")
        .select("bags_collected, actual_attendees, duration_hours")
        .in("event_id", completedEvents.map((e) => e.id))
    : { data: [] as { bags_collected: number | null; actual_attendees: number | null; duration_hours: number | null }[] };

  const bagsCollected = (statsRows ?? []).reduce((sum, s) => sum + (s.bags_collected ?? 0), 0);
  const volunteerSessions = (statsRows ?? []).reduce((sum, s) => sum + (s.actual_attendees ?? 0), 0);
  const totalHours = Math.round(
    (statsRows ?? []).reduce((sum, s) => sum + (s.duration_hours ?? 0), 0)
  );

  const typeLabel = GROUP_TYPE_LABELS[group.group_type] ?? "Organisation";
  const hasLinks = group.website_url || group.social_url || group.contact_email;
  const locationLabel = group.location_name || group.location_postcode;
  const showMap = group.latitude != null && group.longitude != null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back + Edit/Delete */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/groups"
          className="flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Groups
        </Link>
        {(isOwner || isAdmin) && (
          <div className="flex justify-end gap-2">
            {isOwner && (
              <Link
                href={`/groups/${slug}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit group
              </Link>
            )}
            <DeleteGroupButton groupId={group.id} />
          </div>
        )}
      </div>

      {/* Group header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <div className="flex flex-col items-start sm:flex-row sm:justify-between gap-5">
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {group.name}
              <ShareGroupButton title={group.name} />
            </h1>
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
            {isMember && <p className="mt-1 text-xs text-gray-500">
                You are a member of this group.
              </p>}
          </div>
          {/* Join / Leave */}
          {!isOwner && (
            <div className="shrink-0 flex flex-col items-end gap-2">
              <JoinGroupButton
                groupId={group.id}
                groupSlug={slug}
                initialIsMember={isMember}
                isAuthenticated={!!user}
              />
            </div>
          )}
        </div>

        {/* Links */}
        {hasLinks && (
          <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5">
            {group.website_url && (
              <a
                href={group.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="min-w-0 truncate">{group.website_url}</span>
              </a>
            )}
            {group.social_url && (
              <a
                href={group.social_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="min-w-0 truncate">{group.social_url}</span>
              </a>
            )}
            {group.contact_email && (
              <a
                href={`mailto:${group.contact_email}`}
                className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="min-w-0 truncate">{group.contact_email}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {showMap && (
        <section className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="h-52 sm:h-64">
            <GroupsMap
              groups={[group]}
              centerLat={group.latitude ?? undefined}
              centerLng={group.longitude ?? undefined}
              zoom={12}
            />
          </div>
        </section>
      )}

      {/* Impact stats */}
      <section className="mb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GroupImpactCard
            icon={<Calendar className="h-5 w-5 text-brand" />}
            value={completedEvents.length.toLocaleString()}
            label="Events hosted"
            subLabel="with impact logged"
          />
          <GroupImpactCard
            icon={<Trash className="h-5 w-5 text-brand" />}
            value={bagsCollected.toLocaleString()}
            label="Bags collected"
          />
          <GroupImpactCard
            icon={<Users className="h-5 w-5 text-brand" />}
            value={volunteerSessions.toLocaleString()}
            label="Volunteer sessions"
          />
          <GroupImpactCard
            icon={<Clock className="h-5 w-5 text-brand" />}
            value={totalHours.toLocaleString()}
            label="Total event hours"
          />
        </div>
      </section>

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

  return <Link href={`/profile/${member.username ?? member.user_id}`}>{inner}</Link>;
}

function GroupImpactCard({
  icon,
  value,
  label,
  subLabel,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subLabel?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
      </div>
    </div>
  );
}

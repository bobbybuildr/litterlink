import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, Calendar, BadgeCheck, Flame } from "lucide-react";
import type { GroupWithCounts } from "@/lib/events";
import { GROUP_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FeaturedGroupCardProps {
  group: GroupWithCounts;
  className?: string;
}

/**
 * Larger showcase card for the group with the most activity in the past
 * month. Rendered next to the map on desktop, above the group list.
 */
export function FeaturedGroupCard({ group, className }: FeaturedGroupCardProps) {
  const typeLabel = GROUP_TYPE_LABELS[group.group_type] ?? "Organisation";
  const locationLabel = group.location_name || group.location_postcode;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-blue-200 bg-linear-to-br from-accent/5 to-cyan-50 p-6 shadow-sm",
        className
      )}
    >
      <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
        <Flame className="h-3.5 w-3.5" />
        Featured Group — most active
      </span>

      <div className="flex items-start gap-4">
        {group.logo_url ? (
          <Image
            src={group.logo_url}
            alt={`${group.name} logo`}
            width={72}
            height={72}
            className="h-18 w-18 shrink-0 rounded-xl border border-gray-100 object-cover"
          />
        ) : (
          <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
            <Users className="h-8 w-8 text-accent" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/groups/${group.slug}`}
              className="truncate text-lg font-bold text-gray-900 hover:text-accent transition-colors"
            >
              {group.name}
            </Link>
            {group.creator_is_verified && (
              <BadgeCheck className="h-5 w-5 shrink-0 text-accent" aria-label="Verified group" />
            )}
          </div>
          <span className="mt-1.5 inline-flex w-fit items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {typeLabel}
          </span>
        </div>
      </div>

      {locationLabel && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-gray-600">
          <MapPin className="h-4 w-4 shrink-0" />
          {locationLabel}
        </p>
      )}

      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {group.member_count} member{group.member_count !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {group.upcoming_event_count} upcoming event{group.upcoming_event_count !== 1 ? "s" : ""}
        </span>
      </div>

      {group.description && (
        <p className="mt-4 text-sm text-gray-700 line-clamp-3">{group.description}</p>
      )}

      <Link
        href={`/groups/${group.slug}`}
        className="mt-auto inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-dark transition-colors self-start"
      >
        View group
      </Link>
    </div>
  );
}

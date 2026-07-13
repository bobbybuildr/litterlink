import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, Calendar, BadgeCheck } from "lucide-react";
import type { GroupWithCounts } from "@/lib/events";
import { GROUP_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface GroupCardProps {
  group: GroupWithCounts;
  className?: string;
}

export function GroupCard({ group, className }: GroupCardProps) {
  const typeLabel = GROUP_TYPE_LABELS[group.group_type] ?? "Organisation";
  const locationLabel = group.location_name || group.location_postcode;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {group.logo_url ? (
          <Image
            src={group.logo_url}
            alt={`${group.name} logo`}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-lg border border-gray-100 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10">
            <Users className="h-5 w-5 text-brand" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/groups/${group.slug}`}
              className="truncate font-semibold text-gray-900 hover:text-brand transition-colors"
            >
              {group.name}
            </Link>
            {group.creator_is_verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified group" />
            )}
          </div>
          <span className="mt-1 inline-flex w-fit items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {typeLabel}
          </span>
        </div>
      </div>

      {locationLabel && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {locationLabel}
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {group.member_count} member{group.member_count !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {group.upcoming_event_count} upcoming
        </span>
      </div>

      {group.description && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{group.description}</p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
        <Link
          href={`/groups/${group.slug}`}
          className="flex-1 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}

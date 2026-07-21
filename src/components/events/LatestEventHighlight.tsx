import Link from "next/link";
import Image from "next/image";
import { MapPin, Calendar, Trash, Weight, Users, Clock } from "lucide-react";
import type { EventWithCount } from "@/lib/events";
import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type EventStatsRow = Database["public"]["Tables"]["event_stats"]["Row"];

interface Photo {
  id: string;
  url: string;
}

interface LatestEventHighlightProps {
  event: EventWithCount;
  stats: EventStatsRow;
  photos: Photo[];
  className?: string;
}

const HOTSPOT_LABELS = ["Light", "Mild", "Moderate", "Heavy", "Very heavy"];

export function LatestEventHighlight({ event, stats, photos, className }: LatestEventHighlightProps) {
  const statItems = (
    [
      stats.bags_collected != null && { icon: <Trash className="h-3.5 w-3.5" />, label: `${stats.bags_collected} bags` },
      stats.weight_kg != null && { icon: <Weight className="h-3.5 w-3.5" />, label: `${stats.weight_kg} kg` },
      stats.actual_attendees != null && { icon: <Users className="h-3.5 w-3.5" />, label: `${stats.actual_attendees} attended` },
      stats.area_covered_sqm != null && { icon: <span className="text-xs leading-none">📐</span>, label: `${stats.area_covered_sqm} m²` },
      stats.duration_hours != null && { icon: <Clock className="h-3.5 w-3.5" />, label: `${stats.duration_hours} hrs` },
    ] as (false | { icon: React.ReactNode; label: string })[]
  ).filter((item): item is { icon: React.ReactNode; label: string } => item !== false);

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group flex flex-col rounded-xl border border-gray-200 border-l-4 border-l-emerald-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >


      <h3 className="font-semibold text-gray-900 transition-colors line-clamp-1 group-hover:text-brand">
        {event.title}
      </h3>

      <div className="mt-2 flex flex-col gap-1.5">
        <Meta icon={<Calendar className="h-3.5 w-3.5" />}>{formatDate(event.starts_at)}</Meta>
        <Meta icon={<MapPin className="h-3.5 w-3.5" />}>
          {event.address_label && `${event.address_label}, `}
          {event.location_postcode}
        </Meta>
      </div>

      {statItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {statItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1 text-xs font-medium text-gray-700">
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
      )}

      {stats.hotspot_severity != null && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {HOTSPOT_LABELS[stats.hotspot_severity - 1]} hotspot
          </span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2">
          {photos.slice(0, 4).map((photo) => (
            <div key={photo.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
              <Image src={photo.url} alt="" fill sizes="56px" className="object-cover" />
            </div>
          ))}
          {photos.length > 4 && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-medium text-gray-500">
              +{photos.length - 4}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      {icon}
      {children}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

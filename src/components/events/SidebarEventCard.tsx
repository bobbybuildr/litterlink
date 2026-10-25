import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import type { EventWithCount } from "@/lib/events";
import { cn } from "@/lib/utils";

interface SidebarEventCardProps {
  event: Pick<EventWithCount, "id" | "title" | "starts_at" | "address_label" | "location_postcode">;
  className?: string;
}

/** Compact event card for the narrow event-page sidebar: title, date/time and location only. */
export function SidebarEventCard({ event, className }: SidebarEventCardProps) {
  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-l-4 border-gray-200 border-l-emerald-500 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <h3 className="text-sm line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-brand">
        {event.title}
      </h3>
      <div className="flex flex-col gap-1.5">
        <Meta icon={<Calendar className="h-3.5 w-3.5" />}>{formatEventDate(event.starts_at)}</Meta>
        <Meta icon={<MapPin className="h-3.5 w-3.5" />}>
          {event.address_label && `${event.address_label}, `}
          {event.location_postcode}
        </Meta>
      </div>
    </Link>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-start gap-1.5 text-xs text-gray-500">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 line-clamp-2 wrap-break-word">{children}</span>
    </span>
  );
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import Link from "next/link";
import { MapPin, Calendar, Users } from "lucide-react";
import type { EventWithCount } from "@/lib/events";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: EventWithCount;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
  const isPast = new Date(event.starts_at) < new Date();
  const isCompleted = event.status === "completed";

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      {/* Status badge */}
      {isCompleted && (
        <span className="mb-3 inline-flex w-fit items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          Completed
        </span>
      )}

      <h3 className="font-semibold text-gray-900 group-hover:text-brand transition-colors line-clamp-2">
        {event.title}
      </h3>

      {event.description && (
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
          {event.description}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5">
        <EventMeta icon={<Calendar className="h-3.5 w-3.5" />}>
          {formatEventDate(event.starts_at)}
        </EventMeta>
        <EventMeta icon={<MapPin className="h-3.5 w-3.5" />}>
          {event.address_label ?? event.location_postcode}
        </EventMeta>
        <EventMeta icon={<Users className="h-3.5 w-3.5" />}>
          {event.confirmed_count} joined
          {event.max_attendees != null && ` · ${event.max_attendees} max`}
        </EventMeta>
      </div>

      {!isPast && !isCompleted && (
        <span className="mt-4 inline-flex w-fit items-center rounded-lg bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
          Join this pick →
        </span>
      )}
    </Link>
  );
}

function EventMeta({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      {icon}
      {children}
    </span>
  );
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

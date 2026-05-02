import Link from "next/link";
import { MapPin, Calendar, Users, CheckCircle, XCircle, Clock, BadgeCheck } from "lucide-react";
import type { EventWithCount } from "@/lib/events";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: EventWithCount;
  className?: string;
  backHref?: string;
}

type CardState = "joinable" | "completed" | "cancelled" | "past";

function getCardState(event: EventWithCount): CardState {
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "completed" || new Date(event.starts_at) < new Date()) {
    return "past";
  }

  return "joinable";
}

const stateStyles: Record<
  CardState,
  {
    card: string;
    badge: string | null;
    badgeIcon: React.ReactNode;
    badgeLabel: string | null;
  }
> = {
  joinable: {
    card: "border-gray-200 bg-white",
    badge: null,
    badgeIcon: null,
    badgeLabel: null,
  },
  cancelled: {
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-600",
    badgeIcon: <XCircle className="h-3 w-3" />,
    badgeLabel: "Cancelled",
  },
  past: {
    card: "border-gray-200 bg-gray-50",
    badge: "bg-gray-100 text-gray-600",
    badgeIcon: <Clock className="h-3 w-3" />,
    badgeLabel: "Past event",
  },
  completed: {
    card: "border-gray-200 bg-gray-50",
    badge: "bg-gray-100 text-gray-600",
    badgeIcon: <Clock className="h-3 w-3" />,
    badgeLabel: "Past event",
  },
};

export function EventCard({ event, className, backHref }: EventCardProps) {
  const state = getCardState(event);
  const styles = stateStyles[state];
  const isMuted = state !== "joinable";
  const isCompleted = event.status === "completed";
  const isVerifiedOrganiser = event.organiser_is_verified;

  const href = backHref
    ? `/events/${event.id}?back=${encodeURIComponent(backHref)}`
    : `/events/${event.id}`;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md",
        styles.card,
        className
      )}
    >

      {/* Status badge */}
      {styles.badge && styles.badgeLabel && (
        <span className={cn("mb-3 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", styles.badge)}>
          {styles.badgeIcon}
          {styles.badgeLabel}
        </span>
      )}
      {isCompleted && (
        <span className="-mt-1 mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle className="h-3 w-3" />
          Impact logged
        </span>
      )}
      {isVerifiedOrganiser && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/5 px-2 py-1">
          <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />
        </span>
      )}

      <div className="flex justify-between">
        <h3
          className={cn(
            "font-semibold transition-colors line-clamp-2",
            isMuted ? "text-gray-600" : "text-gray-900 group-hover:text-brand",
            isVerifiedOrganiser && "pr-8"
          )}
        >
          {event.title}
        </h3>
      </div>

      {event.description && (
        <p className={cn("mt-1 text-sm line-clamp-2", isMuted ? "text-gray-500" : "text-gray-500")}>
          {event.description}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5">
        <EventMeta icon={<Calendar className="h-3.5 w-3.5" />}>
          {formatEventDate(event.starts_at)}
        </EventMeta>
        <EventMeta icon={<MapPin className="h-3.5 w-3.5" />}>
          {event.address_label && `${event.address_label}, `}
          {event.location_postcode}
        </EventMeta>
        <EventMeta icon={<Users className="h-3.5 w-3.5" />}>
          {event.confirmed_count} joined
          {event.max_attendees != null && ` · ${event.max_attendees} max`}
        </EventMeta>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Date.now() - new Date(event.created_at).getTime() < 48 * 60 * 60 * 1000 && (
          <span className="inline-flex w-fit items-center rounded-lg bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            New
          </span>
        )}
        {state === "joinable" && (
          <span className="inline-flex w-fit items-center rounded-lg bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            Upcoming
          </span>
        )}
      </div>
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
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

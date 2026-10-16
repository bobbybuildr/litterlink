import { GROUP_TYPE_LABELS } from "@/lib/constants";
import type { EventWithCount, GroupRow } from "@/lib/events";
import { districtName, metaDescription } from "@/lib/seo";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

export type ShareBadgeTone = "brand" | "neutral" | "warning" | "danger";

export interface ShareCardContent {
  badge: { label: string; tone: ShareBadgeTone };
  title: string;
  details: { icon: "pin" | "calendar" | "users"; text: string }[];
  /** Shown in the footer beside the domain, e.g. "Hosted by …". */
  host: string | null;
}

const TITLE_MAX = 100;
/** Shrinks the title as it grows so even a maximum-length title fits in four lines. */
const TITLE_SIZES = [
  { maxLength: 24, fontSize: 80 },
  { maxLength: 44, fontSize: 68 },
  { maxLength: 70, fontSize: 56 },
] as const;
const TITLE_MIN_FONT_SIZE = 46;

export function fitShareTitle(title: string): { text: string; fontSize: number } {
  const text = metaDescription(title, TITLE_MAX);
  const fontSize = TITLE_SIZES.find((size) => text.length <= size.maxLength)?.fontSize ?? TITLE_MIN_FONT_SIZE;
  return { text, fontSize };
}

const TIME_ZONE = "Europe/London";

function londonDayKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function londonTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}

/** "Saturday 24 October, 10:00–12:00", adding the year when it isn't the current one. */
export function formatShareDate(startsAt: string, endsAt: string | null, now = new Date()): string {
  const start = new Date(startsAt);
  const sameYear = londonDayKey(start).slice(0, 4) === londonDayKey(now).slice(0, 4);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
      .formatToParts(start)
      .map(({ type, value }) => [type, value])
  );
  const day = `${parts.weekday} ${parts.day} ${parts.month}${sameYear ? "" : ` ${parts.year}`}`;
  const end = endsAt ? new Date(endsAt) : null;
  const time =
    end && end > start && londonDayKey(end) === londonDayKey(start)
      ? `${londonTime(start)}–${londonTime(end)}`
      : londonTime(start);
  // Comma rather than a middle dot: the bundled Geist subset has no "·" glyph.
  return `${day}, ${time}`;
}

type EventShareFields = Pick<
  EventWithCount,
  | "title"
  | "status"
  | "starts_at"
  | "ends_at"
  | "address_label"
  | "location_postcode"
  | "location_admin_district"
  | "group_name"
  | "organiser_name"
>;

/** The meeting point, followed by the district when the meeting point doesn't already name it. */
function eventPlace(event: EventShareFields): string {
  const meetingPoint = event.address_label ?? event.location_postcode;
  const district = districtName(event.location_admin_district);
  const place =
    district && !meetingPoint.toLowerCase().includes(district.toLowerCase())
      ? `${meetingPoint}, ${district}`
      : meetingPoint;
  return metaDescription(place, 70);
}

function eventBadge(event: EventShareFields, now: Date): ShareCardContent["badge"] {
  switch (event.status) {
    case "cancelled":
      return { label: "Event cancelled", tone: "danger" };
    case "completed":
      return { label: "Completed litter pick", tone: "neutral" };
    case "draft":
      return { label: "Draft event", tone: "warning" };
    default:
      return new Date(event.ends_at ?? event.starts_at) < now
        ? { label: "Past litter pick", tone: "neutral" }
        : { label: "Upcoming litter pick", tone: "brand" };
  }
}

export function eventShareCard(event: EventShareFields, now = new Date()): ShareCardContent {
  const hostName = event.group_name ?? event.organiser_name;
  return {
    badge: eventBadge(event, now),
    title: event.title,
    details: [
      { icon: "pin", text: eventPlace(event) },
      { icon: "calendar", text: formatShareDate(event.starts_at, event.ends_at, now) },
    ],
    host: hostName ? `Hosted by ${metaDescription(hostName, 60)}` : null,
  };
}

type GroupShareFields = Pick<GroupRow, "name" | "group_type" | "location_name" | "location_postcode">;

// Member and event counts are left out: they change often and platforms cache the card.
export function groupShareCard(group: GroupShareFields): ShareCardContent {
  const location = group.location_name || group.location_postcode;
  return {
    badge: { label: "Litter picking group", tone: "brand" },
    title: group.name,
    details: [
      ...(location ? [{ icon: "pin" as const, text: metaDescription(location, 70) }] : []),
      { icon: "users", text: GROUP_TYPE_LABELS[group.group_type] ?? GROUP_TYPE_LABELS.other },
    ],
    host: null,
  };
}

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { PRIVACY_LAST_UPDATED, TERMS_LAST_UPDATED } from "@/lib/legal";
import type { EventStatus } from "@/types/database";

/** Google and Bing reject sitemap files above this; split with `generateSitemaps()` before reaching it. */
export const SITEMAP_URL_LIMIT = 50_000;

/**
 * Past events still `published` this long after they started were never wrapped up with stats. Their pages only say
 * "This event has finished", so they're left out of the sitemap. Organisers get a stats reminder 12 hours after the
 * start, so two weeks leaves plenty of time to log stats before the event drops out.
 */
export const STALE_EVENT_GRACE_DAYS = 14;

export interface SitemapEvent {
  id: string;
  status: EventStatus;
  starts_at: string;
  created_at: string;
  content_updated_at: string | null;
}

export interface SitemapEventStats {
  event_id: string;
  updated_at: string;
}

export interface SitemapGroup {
  slug: string;
}

export interface SitemapData {
  events: SitemapEvent[];
  eventStats: SitemapEventStats[];
  groups: SitemapGroup[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Only completed events and published events that are upcoming or still within the wrap-up grace period. */
export function isSitemapEvent(event: Pick<SitemapEvent, "status" | "starts_at">, now: Date): boolean {
  if (event.status === "completed") return true;
  if (event.status !== "published") return false;
  return new Date(event.starts_at).getTime() >= now.getTime() - STALE_EVENT_GRACE_DAYS * DAY_MS;
}

function latest(dates: (string | null | undefined)[]): Date | undefined {
  let max: number | undefined;
  for (const value of dates) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time) && (max === undefined || time > max)) max = time;
  }
  return max === undefined ? undefined : new Date(max);
}

/**
 * Latest change to what the event page shows: creation, organiser edits (`content_updated_at`) or logged stats.
 * Deliberately ignores `updated_at`, which system-only writes (reminder and reschedule bookkeeping) also bump.
 */
export function eventLastModified(event: SitemapEvent, statsUpdatedAt?: string | null): Date {
  return latest([event.created_at, event.content_updated_at, statsUpdatedAt]) ?? new Date(event.created_at);
}

/**
 * Builds sitemap entries from public data. `lastModified` is only set where it reflects a real content change:
 * groups have no edit timestamp, so `/groups` and group pages leave it out rather than guess.
 */
export function buildSitemap({ events, eventStats, groups }: SitemapData, now = new Date()): MetadataRoute.Sitemap {
  const statsUpdatedAt = new Map(eventStats.map((stats) => [stats.event_id, stats.updated_at]));

  const eventEntries = events
    .filter((event) => isSitemapEvent(event, now))
    .map((event) => ({
      url: absoluteUrl(`/events/${event.id}`),
      lastModified: eventLastModified(event, statsUpdatedAt.get(event.id)),
    }));

  const eventsListModified = latest(eventEntries.map((entry) => entry.lastModified.toISOString()));
  // The homepage and /impact show totals derived from logged stats.
  const impactModified = latest(eventStats.map((stats) => stats.updated_at));

  const page = (path: string, lastModified?: Date | string): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
  });

  return [
    page("/", impactModified),
    page("/events", eventsListModified),
    page("/groups"),
    page("/impact", impactModified),
    page("/privacy", PRIVACY_LAST_UPDATED),
    page("/terms", TERMS_LAST_UPDATED),
    ...eventEntries,
    ...groups.map((group) => page(`/groups/${encodeURIComponent(group.slug)}`)),
  ];
}

import { describe, expect, it } from "vitest";
import { absoluteUrl } from "@/lib/seo";
import { PRIVACY_LAST_UPDATED, TERMS_LAST_UPDATED, formatLegalDate } from "@/lib/legal";
import {
  STALE_EVENT_GRACE_DAYS,
  buildSitemap,
  eventLastModified,
  isSitemapEvent,
  isStaleEvent,
  type SitemapEvent,
} from "@/lib/sitemap";

const NOW = new Date("2026-10-16T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString();

function event(overrides: Partial<SitemapEvent> = {}): SitemapEvent {
  return {
    id: "e1",
    status: "published",
    starts_at: daysFromNow(7),
    created_at: "2026-10-01T09:00:00Z",
    content_updated_at: null,
    ...overrides,
  };
}

describe("isSitemapEvent", () => {
  it("includes upcoming published events", () => {
    expect(isSitemapEvent(event(), NOW)).toBe(true);
  });

  it("includes completed events however old", () => {
    expect(isSitemapEvent(event({ status: "completed", starts_at: daysFromNow(-400) }), NOW)).toBe(true);
  });

  it("keeps past published events during the wrap-up grace period", () => {
    expect(isSitemapEvent(event({ starts_at: daysFromNow(-1) }), NOW)).toBe(true);
    expect(isSitemapEvent(event({ starts_at: daysFromNow(-STALE_EVENT_GRACE_DAYS) }), NOW)).toBe(true);
  });

  it("drops published events never wrapped up after the grace period", () => {
    expect(isSitemapEvent(event({ starts_at: daysFromNow(-STALE_EVENT_GRACE_DAYS - 1) }), NOW)).toBe(false);
  });

  it("drops drafts and cancelled events", () => {
    expect(isSitemapEvent(event({ status: "draft" }), NOW)).toBe(false);
    expect(isSitemapEvent(event({ status: "cancelled" }), NOW)).toBe(false);
  });
});

describe("isStaleEvent", () => {
  it("flags published events never wrapped up after the grace period", () => {
    expect(isStaleEvent(event({ starts_at: daysFromNow(-STALE_EVENT_GRACE_DAYS - 1) }), NOW)).toBe(true);
  });

  it("does not flag upcoming events or past events still within the grace period", () => {
    expect(isStaleEvent(event(), NOW)).toBe(false);
    expect(isStaleEvent(event({ starts_at: daysFromNow(-STALE_EVENT_GRACE_DAYS) }), NOW)).toBe(false);
  });

  it("does not flag completed, cancelled or draft events however old", () => {
    for (const status of ["completed", "cancelled", "draft"] as const) {
      expect(isStaleEvent(event({ status, starts_at: daysFromNow(-400) }), NOW)).toBe(false);
    }
  });

  it("agrees with isSitemapEvent for published events", () => {
    for (const days of [-400, -STALE_EVENT_GRACE_DAYS - 1, -STALE_EVENT_GRACE_DAYS, -1, 7]) {
      const published = event({ starts_at: daysFromNow(days) });
      expect(isStaleEvent(published, NOW)).toBe(!isSitemapEvent(published, NOW));
    }
  });
});

describe("eventLastModified", () => {
  it("falls back to the creation time", () => {
    expect(eventLastModified(event())).toEqual(new Date("2026-10-01T09:00:00Z"));
  });

  it("uses the latest of creation, content edits and stats", () => {
    const edited = event({ content_updated_at: "2026-10-05T10:00:00Z" });
    expect(eventLastModified(edited)).toEqual(new Date("2026-10-05T10:00:00Z"));
    expect(eventLastModified(edited, "2026-10-12T18:30:00Z")).toEqual(new Date("2026-10-12T18:30:00Z"));
    expect(eventLastModified(edited, "2026-10-02T00:00:00Z")).toEqual(new Date("2026-10-05T10:00:00Z"));
  });
});

describe("buildSitemap", () => {
  const sitemap = buildSitemap(
    {
      events: [
        event({ id: "upcoming", content_updated_at: "2026-10-10T08:00:00Z" }),
        event({ id: "completed", status: "completed", starts_at: daysFromNow(-30) }),
        event({ id: "stale", starts_at: daysFromNow(-60), created_at: "2026-10-15T00:00:00Z" }),
      ],
      eventStats: [{ event_id: "completed", updated_at: "2026-10-11T20:00:00Z" }],
      groups: [{ slug: "bromsgrove-pickers" }],
    },
    NOW
  );
  const entry = (path: string) => sitemap.find((e) => e.url === absoluteUrl(path));

  it("lists every public page once", () => {
    expect(sitemap.map((e) => e.url)).toEqual(
      [
        "/",
        "/events",
        "/groups",
        "/impact",
        "/privacy",
        "/terms",
        "/events/upcoming",
        "/events/completed",
        "/groups/bromsgrove-pickers",
      ].map(absoluteUrl)
    );
  });

  it("leaves out stale events, including from the /events lastModified", () => {
    expect(entry("/events/stale")).toBeUndefined();
    expect(entry("/events")?.lastModified).toEqual(new Date("2026-10-11T20:00:00Z"));
  });

  it("dates events from content edits and stats", () => {
    expect(entry("/events/upcoming")?.lastModified).toEqual(new Date("2026-10-10T08:00:00Z"));
    expect(entry("/events/completed")?.lastModified).toEqual(new Date("2026-10-11T20:00:00Z"));
  });

  it("dates the homepage and /impact from the latest stats", () => {
    expect(entry("/")?.lastModified).toEqual(new Date("2026-10-11T20:00:00Z"));
    expect(entry("/impact")?.lastModified).toEqual(new Date("2026-10-11T20:00:00Z"));
  });

  it("dates the legal pages from their published 'Last updated' dates", () => {
    expect(entry("/privacy")?.lastModified).toBe(PRIVACY_LAST_UPDATED);
    expect(entry("/terms")?.lastModified).toBe(TERMS_LAST_UPDATED);
  });

  it("omits lastModified where there is no edit timestamp", () => {
    expect(entry("/groups")).not.toHaveProperty("lastModified");
    expect(entry("/groups/bromsgrove-pickers")).not.toHaveProperty("lastModified");
  });

  it("never stamps the request time", () => {
    for (const e of sitemap) expect(e.lastModified).not.toEqual(NOW);
  });

  it("omits data-derived dates when there is no data", () => {
    const empty = buildSitemap({ events: [], eventStats: [], groups: [] }, NOW);
    expect(empty).toHaveLength(6);
    for (const path of ["/", "/events", "/impact"]) {
      expect(empty.find((e) => e.url === absoluteUrl(path))).not.toHaveProperty("lastModified");
    }
  });
});

describe("formatLegalDate", () => {
  it("formats ISO dates as UK long dates", () => {
    expect(formatLegalDate("2026-04-03")).toBe("3 April 2026");
    expect(formatLegalDate("2026-09-24")).toBe("24 September 2026");
  });
});

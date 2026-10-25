import { describe, expect, it, vi } from "vitest";
import {
  NEARBY_EVENT_RADIUS_KM,
  boundingBox,
  getLaterEvents,
  getRelatedEvents,
  haversineKm,
  nearestEvent,
} from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

// events.ts imports the cookie-based server client; haversineKm doesn't need it.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

function mockLaterQuery(pages: Array<{ data: unknown[] | null; count: number | null; error?: unknown }>) {
  const ranges: Array<[number, number]> = [];
  const filters: Array<[string, ...unknown[]]> = [];
  let call = 0;
  const query: Record<string, unknown> = {};
  for (const name of ["select", "eq", "gte", "order"]) {
    query[name] = vi.fn((...args: unknown[]) => {
      filters.push([name, ...args]);
      return query;
    });
  }
  query.range = vi.fn((start: number, end: number) => {
    ranges.push([start, end]);
    const result = pages[Math.min(call++, pages.length - 1)];
    return Promise.resolve({ error: null, ...result });
  });
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => query) } as never);
  return { ranges, filters };
}

describe("getLaterEvents", () => {
  it("reads one page from the database with the right filters", async () => {
    const { ranges, filters } = mockLaterQuery([{ data: [{ id: "a" }, { id: "b" }], count: 25 }]);

    const result = await getLaterEvents({ fromDate: "2026-11-01", page: 2, pageSize: 10 });

    expect(ranges).toEqual([[10, 19]]);
    expect(filters).toContainEqual(["eq", "status", "published"]);
    expect(filters).toContainEqual(["gte", "starts_at", "2026-11-01T00:00:00"]);
    expect(result).toMatchObject({ total: 25, page: 2, totalPages: 3 });
    expect(result.events).toHaveLength(2);
  });

  it("falls back to the last page when the requested page is out of range", async () => {
    const { ranges } = mockLaterQuery([
      { data: [], count: 12 },
      { data: [{ id: "k" }], count: 12 },
    ]);

    const result = await getLaterEvents({ fromDate: "2026-11-01", page: 9, pageSize: 10 });

    expect(ranges).toEqual([
      [80, 89],
      [10, 19],
    ]);
    expect(result).toMatchObject({ total: 12, page: 2, totalPages: 2 });
    expect(result.events).toEqual([{ id: "k" }]);
  });

  it("returns an empty list when there are no later events", async () => {
    mockLaterQuery([{ data: [], count: 0 }]);
    expect(await getLaterEvents({ fromDate: "2026-11-01", page: 1, pageSize: 10 })).toEqual({
      events: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });
  });

  it("returns an empty list on a query error", async () => {
    mockLaterQuery([{ data: null, count: null, error: { message: "boom" } }]);
    const result = await getLaterEvents({ fromDate: "2026-11-01", page: 1, pageSize: 10 });
    expect(result).toEqual({ events: [], total: 0, page: 1, totalPages: 1 });
  });
});

const LONDON = { lat: 51.5074, lng: -0.1278 };
const MANCHESTER = { lat: 53.4808, lng: -2.2426 };

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(LONDON.lat, LONDON.lng, LONDON.lat, LONDON.lng)).toBe(0);
  });

  it("measures London to Manchester as about 262 km", () => {
    const km = haversineKm(LONDON.lat, LONDON.lng, MANCHESTER.lat, MANCHESTER.lng);
    expect(km).toBeGreaterThan(261);
    expect(km).toBeLessThan(263);
  });

  it("is symmetric", () => {
    expect(haversineKm(LONDON.lat, LONDON.lng, MANCHESTER.lat, MANCHESTER.lng)).toBeCloseTo(
      haversineKm(MANCHESTER.lat, MANCHESTER.lng, LONDON.lat, LONDON.lng),
      10
    );
  });

  it("gives about 111.19 km per degree of latitude", () => {
    expect(haversineKm(50, -1, 51, -1)).toBeCloseTo(111.19, 1);
  });

  it("shrinks longitude distance with latitude", () => {
    const atEquator = haversineKm(0, 0, 0, 1);
    const inUk = haversineKm(54, 0, 54, 1);
    expect(inUk).toBeLessThan(atEquator);
    expect(inUk).toBeCloseTo(atEquator * Math.cos((54 * Math.PI) / 180), 1);
  });
});

describe("boundingBox", () => {
  it("contains points just inside the radius in every direction", () => {
    const box = boundingBox(LONDON.lat, LONDON.lng, 10);
    // ~9.9 km due north, south, east and west
    const km = 9.9;
    const dLat = km / 111.19;
    const dLng = km / (111.19 * Math.cos((LONDON.lat * Math.PI) / 180));
    expect(LONDON.lat + dLat).toBeLessThan(box.maxLat);
    expect(LONDON.lat - dLat).toBeGreaterThan(box.minLat);
    expect(LONDON.lng + dLng).toBeLessThan(box.maxLng);
    expect(LONDON.lng - dLng).toBeGreaterThan(box.minLng);
  });

  it("is no wider than needed", () => {
    const box = boundingBox(LONDON.lat, LONDON.lng, 10);
    expect(haversineKm(LONDON.lat, LONDON.lng, box.maxLat, LONDON.lng)).toBeCloseTo(10, 1);
    expect(box.maxLng - LONDON.lng).toBeCloseTo(LONDON.lng - box.minLng, 10);
  });
});

describe("nearestEvent", () => {
  const origin = { latitude: LONDON.lat, longitude: LONDON.lng };
  // About 1.1 km, 2.2 km and 111 km north of the origin
  const near = { id: "near", latitude: LONDON.lat + 0.01, longitude: LONDON.lng, starts_at: "2026-11-05T10:00:00Z" };
  const nearer = { id: "nearer", latitude: LONDON.lat + 0.02, longitude: LONDON.lng, starts_at: "2026-11-01T10:00:00Z" };
  const far = { id: "far", latitude: LONDON.lat + 1, longitude: LONDON.lng, starts_at: "2026-11-02T10:00:00Z" };

  it("picks the closest event, not the earliest", () => {
    expect(nearestEvent([nearer, near, far], origin, 10)?.id).toBe("near");
  });

  it("ignores events beyond the radius", () => {
    expect(nearestEvent([far], origin, 10)).toBeNull();
    expect(nearestEvent([nearer, far], origin, 10)?.id).toBe("nearer");
  });

  it("skips excluded ids", () => {
    expect(nearestEvent([near, nearer], origin, 10, ["near"])?.id).toBe("nearer");
    expect(nearestEvent([near], origin, 10, ["near"])).toBeNull();
  });

  it("breaks distance ties with the earlier start", () => {
    const sameSpotLater = { ...near, id: "later", starts_at: "2026-12-01T10:00:00Z" };
    expect(nearestEvent([sameSpotLater, near], origin, 10)?.id).toBe("near");
  });

  it("returns null for no candidates", () => {
    expect(nearestEvent([], origin, 10)).toBeNull();
  });
});

describe("getRelatedEvents", () => {
  const source = {
    id: "current",
    organiser_id: "org-1",
    group_id: "group-1",
    latitude: LONDON.lat,
    longitude: LONDON.lng,
  };
  const now = new Date("2026-10-25T12:00:00Z");

  // Each `from()` call gets the next result, in call order: organiser query, then nearby query.
  function mockRelatedQueries(results: Array<{ data: unknown[] | null; error?: unknown }>) {
    const calls: Array<Array<[string, ...unknown[]]>> = [];
    let call = 0;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => {
        const filters: Array<[string, ...unknown[]]> = [];
        calls.push(filters);
        const result = { error: null, ...results[call++] };
        const query: Record<string, unknown> = {
          then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
        };
        for (const name of ["select", "eq", "neq", "gte", "lte", "or", "order", "limit"]) {
          query[name] = vi.fn((...args: unknown[]) => {
            filters.push([name, ...args]);
            return query;
          });
        }
        return query;
      }),
    } as never);
    return calls;
  }

  const eventAt = (id: string, latOffset: number, startsAt = "2026-11-01T10:00:00Z") => ({
    id,
    latitude: LONDON.lat + latOffset,
    longitude: LONDON.lng,
    starts_at: startsAt,
  });

  it("returns the organiser's next event and the closest nearby event", async () => {
    const calls = mockRelatedQueries([
      { data: [eventAt("by-organiser", 2)] },
      { data: [eventAt("far-ish", 0.05), eventAt("closest", 0.01)] },
    ]);

    const result = await getRelatedEvents(source, now);

    expect(result.moreFromOrganiser?.id).toBe("by-organiser");
    expect(result.nearby?.id).toBe("closest");
    for (const filters of calls) {
      expect(filters).toContainEqual(["eq", "status", "published"]);
      expect(filters).toContainEqual(["gte", "starts_at", now.toISOString()]);
      expect(filters).toContainEqual(["neq", "id", "current"]);
    }
    expect(calls[0]).toContainEqual(["or", "organiser_id.eq.org-1,group_id.eq.group-1"]);
    expect(calls[0]).toContainEqual(["limit", 1]);
    expect(calls[1].map(([name]) => name)).toEqual(
      expect.arrayContaining(["gte", "lte"])
    );
  });

  it("doesn't suggest the organiser's event again as the nearby event", async () => {
    mockRelatedQueries([
      { data: [eventAt("by-organiser", 0.01)] },
      { data: [eventAt("by-organiser", 0.01), eventAt("someone-else", 0.03)] },
    ]);

    const result = await getRelatedEvents(source, now);

    expect(result.moreFromOrganiser?.id).toBe("by-organiser");
    expect(result.nearby?.id).toBe("someone-else");
  });

  it("returns nothing when there are no other upcoming events", async () => {
    mockRelatedQueries([{ data: [] }, { data: [] }]);
    expect(await getRelatedEvents(source, now)).toEqual({ moreFromOrganiser: null, nearby: null });
  });

  it("ignores candidates in the bounding box that are outside the radius", async () => {
    // 80% of the radius north and 80% east: inside the square box, but about 113% of the radius away.
    const kmPerDegreeLat = 111.19;
    const kmPerDegreeLng = kmPerDegreeLat * Math.cos((LONDON.lat * Math.PI) / 180);
    const corner = {
      ...eventAt("corner", (0.8 * NEARBY_EVENT_RADIUS_KM) / kmPerDegreeLat),
      longitude: LONDON.lng + (0.8 * NEARBY_EVENT_RADIUS_KM) / kmPerDegreeLng,
    };
    const box = boundingBox(source.latitude, source.longitude, NEARBY_EVENT_RADIUS_KM);
    expect(corner.latitude).toBeLessThan(box.maxLat);
    expect(corner.longitude).toBeLessThan(box.maxLng);
    expect(haversineKm(source.latitude, source.longitude, corner.latitude, corner.longitude)).toBeGreaterThan(
      NEARBY_EVENT_RADIUS_KM
    );

    mockRelatedQueries([{ data: [] }, { data: [corner] }]);
    expect((await getRelatedEvents(source, now)).nearby).toBeNull();
  });

  it("matches on the group alone when the organiser account is gone", async () => {
    const calls = mockRelatedQueries([{ data: [] }, { data: [] }]);
    await getRelatedEvents({ ...source, organiser_id: null }, now);
    expect(calls[0]).toContainEqual(["or", "group_id.eq.group-1"]);
  });

  it("skips the organiser query when there is neither an organiser nor a group", async () => {
    const calls = mockRelatedQueries([{ data: [eventAt("near", 0.01)] }]);

    const result = await getRelatedEvents({ ...source, organiser_id: null, group_id: null }, now);

    expect(calls).toHaveLength(1);
    expect(result.moreFromOrganiser).toBeNull();
    expect(result.nearby?.id).toBe("near");
  });

  it("treats query errors as no suggestion", async () => {
    mockRelatedQueries([
      { data: null, error: { message: "boom" } },
      { data: null, error: { message: "boom" } },
    ]);
    expect(await getRelatedEvents(source, now)).toEqual({ moreFromOrganiser: null, nearby: null });
  });
});

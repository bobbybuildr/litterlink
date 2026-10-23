import { describe, expect, it, vi } from "vitest";
import { getLaterEvents, haversineKm } from "@/lib/events";
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

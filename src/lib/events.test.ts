import { describe, expect, it, vi } from "vitest";
import { haversineKm } from "@/lib/events";

// events.ts imports the cookie-based server client; haversineKm doesn't need it.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

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

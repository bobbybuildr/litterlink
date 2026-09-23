import "server-only";
import { normalisePostcode } from "@/lib/utils";

/**
 * UK postcode geocoding via the free postcodes.io API.
 * Server-side only — the browser reaches this through /api/geocode and
 * /api/reverse-geocode so third-party lookups stay off the client.
 */
export interface GeoResult {
  /** Postcode centroid — not necessarily a user's chosen meeting point. */
  latitude: number;
  longitude: number;
  postcode: string;
  outcode: string;
  adminDistrict: string | null;
}

/** A point is treated as unmoved if it shifts by less than this. */
export const LOCATION_MOVE_THRESHOLD_METRES = 25;

export const NO_UK_POSTCODE_MESSAGE =
  "We couldn't identify a UK postcode for this location. Try choosing another point on the map, or enter the nearest postcode manually.";

export const INVALID_COORDINATES_MESSAGE =
  "The selected map location is invalid. Please choose the meeting point again or enter a postcode.";

const API_TIMEOUT_MS = 5000;
const POSTCODE_CACHE_SECONDS = 86400; // postcodes don't move
const REVERSE_CACHE_SECONDS = 3600;
const REVERSE_RADIUS_METRES = 2000; // postcodes.io maximum for a normal search

interface PostcodesIoPostcode {
  postcode?: string | null;
  outcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  admin_district?: string | null;
}

function toGeoResult(
  result: PostcodesIoPostcode | null | undefined
): GeoResult | null {
  if (!result?.postcode || !result.outcode) return null;
  if (
    typeof result.latitude !== "number" ||
    typeof result.longitude !== "number"
  ) {
    return null;
  }
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    postcode: result.postcode,
    outcode: result.outcode,
    adminDistrict: result.admin_district ?? null,
  };
}

async function fetchPostcodesIo<T>(
  url: string,
  revalidate: number
): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { status?: number; result?: T };
    if (json.status !== 200 || !json.result) return null;

    return json.result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Great-circle distance between two points, in metres. */
export function distanceMetres(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const earthRadius = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Geocodes a UK postcode.
 * Returns null if the postcode is invalid or the API fails.
 */
export async function geocodePostcode(
  postcode: string
): Promise<GeoResult | null> {
  const clean = normalisePostcode(postcode);
  if (!clean) return null;

  const result = await fetchPostcodesIo<PostcodesIoPostcode>(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`,
    POSTCODE_CACHE_SECONDS
  );

  return toGeoResult(result);
}

/**
 * Finds the nearest UK postcode to a pair of coordinates. Returns null when the
 * point has no UK postcode nearby (e.g. it sits outside the UK).
 *
 * The returned latitude/longitude are the *postcode centroid* — callers that
 * started from a user-chosen point must keep their own coordinates.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeoResult | null> {
  if (!isValidCoordinate(latitude, longitude)) return null;

  // Rounded to ~11 m so repeat lookups around the same point share a cache entry.
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);
  const base = `https://api.postcodes.io/postcodes?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}`;

  const nearby = await fetchPostcodesIo<PostcodesIoPostcode[]>(
    `${base}&limit=1&radius=${REVERSE_RADIUS_METRES}`,
    REVERSE_CACHE_SECONDS
  );
  const nearest = toGeoResult(nearby?.[0]);
  if (nearest) return nearest;

  // Beaches, moorland and large parks can sit well outside any postcode's 2 km
  // radius, so fall back to postcodes.io's 20 km wide search.
  const wide = await fetchPostcodesIo<PostcodesIoPostcode[]>(
    `${base}&wideSearch=true`,
    REVERSE_CACHE_SECONDS
  );
  return toGeoResult(wide?.[0]);
}

export interface EventLocation {
  /** The meeting point actually stored on the event. */
  latitude: number;
  longitude: number;
  postcode: string;
  outcode: string;
  adminDistrict: string | null;
}

export type EventLocationResult =
  | { ok: true; location: EventLocation }
  | { ok: false; error: string };

/**
 * Resolves the geographic data an event needs, never trusting client-supplied
 * postcode metadata.
 *
 * - `usePin`: the organiser picked a point on the map or used their device
 *   location, so those exact coordinates are kept and the postcode, outcode and
 *   admin district are resolved from them.
 * - otherwise: the organiser typed a postcode, so its centroid is used.
 */
export async function resolveEventLocation(params: {
  usePin: boolean;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
}): Promise<EventLocationResult> {
  const { usePin, postcode, latitude, longitude } = params;

  if (usePin) {
    if (
      latitude === null ||
      longitude === null ||
      !isValidCoordinate(latitude, longitude)
    ) {
      return { ok: false, error: INVALID_COORDINATES_MESSAGE };
    }

    const geo = await reverseGeocode(latitude, longitude);
    if (!geo) return { ok: false, error: NO_UK_POSTCODE_MESSAGE };

    return {
      ok: true,
      location: {
        latitude,
        longitude,
        postcode: geo.postcode,
        outcode: geo.outcode,
        adminDistrict: geo.adminDistrict,
      },
    };
  }

  const geo = await geocodePostcode(postcode);
  if (!geo) {
    return {
      ok: false,
      error: `Postcode "${postcode}" wasn't recognised. Please enter a valid UK postcode.`,
    };
  }

  return {
    ok: true,
    location: {
      latitude: geo.latitude,
      longitude: geo.longitude,
      postcode: geo.postcode,
      outcode: geo.outcode,
      adminDistrict: geo.adminDistrict,
    },
  };
}

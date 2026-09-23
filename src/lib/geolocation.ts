/**
 * Browser-side location helpers: the Geolocation API plus thin wrappers around
 * the server-side geocoding routes. Geocoding itself stays on the server, so
 * these only ever call our own /api endpoints.
 */

const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
};

export const GEOLOCATION_UNSUPPORTED_MESSAGE =
  "Geolocation isn't supported on this device.";

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function requestCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      ...DEFAULT_GEOLOCATION_OPTIONS,
      ...options,
    });
  });
}

export function geolocationErrorMessage(error: unknown): string {
  const code = (error as { code?: number } | null)?.code;

  if (code === 1) {
    return "Location permission was denied. You can still enter a postcode.";
  }
  if (code === 2) {
    return "Your location couldn't be determined. Try again or enter a postcode.";
  }
  if (code === 3) {
    return "Location request timed out. Please try again.";
  }
  return "Couldn't use your location right now. Please try again.";
}

export type PostcodeLookup =
  | { ok: true; postcode: string; latitude: number; longitude: number }
  | { ok: false; error: string };

interface GeocodeResponse {
  postcode?: string;
  latitude?: number;
  longitude?: number;
  error?: string;
}

async function readLookup(
  response: Response,
  fallbackError: string
): Promise<PostcodeLookup> {
  let data: GeocodeResponse = {};
  try {
    data = (await response.json()) as GeocodeResponse;
  } catch {
    // fall through to the generic error below
  }

  if (
    !response.ok ||
    !data.postcode ||
    typeof data.latitude !== "number" ||
    typeof data.longitude !== "number"
  ) {
    return { ok: false, error: data.error ?? fallbackError };
  }

  return {
    ok: true,
    postcode: data.postcode.toUpperCase(),
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

/**
 * Nearest UK postcode to a point. The returned coordinates are the postcode
 * centroid, so keep the original point if it is the user's chosen location.
 */
export async function lookupNearestPostcode(
  latitude: number,
  longitude: number
): Promise<PostcodeLookup> {
  try {
    const response = await fetch(
      `/api/reverse-geocode?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`
    );
    return await readLookup(
      response,
      "Couldn't find a nearby postcode. Try entering one manually."
    );
  } catch {
    return { ok: false, error: "Location lookup failed. Please try again." };
  }
}

/** Coordinates for a typed postcode (the postcode centroid). */
export async function lookupPostcode(
  postcode: string
): Promise<PostcodeLookup> {
  try {
    const response = await fetch(
      `/api/geocode?postcode=${encodeURIComponent(postcode)}`
    );
    return await readLookup(
      response,
      `Postcode "${postcode.toUpperCase()}" wasn't recognised.`
    );
  } catch {
    return { ok: false, error: "Postcode lookup failed. Please try again." };
  }
}

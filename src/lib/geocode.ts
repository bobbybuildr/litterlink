/**
 * Geocodes a UK postcode using the free postcodes.io API.
 * Called server-side only to avoid CORS issues.
 * Returns null if the postcode is invalid or the API fails.
 */
export interface GeoResult {
  latitude: number;
  longitude: number;
  postcode: string;
}

export async function geocodePostcode(
  postcode: string
): Promise<GeoResult | null> {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, "");

  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`,
      { next: { revalidate: 86400 } } // cache 24h — postcodes don't move
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 200 || !json.result) return null;

    return {
      latitude: json.result.latitude,
      longitude: json.result.longitude,
      postcode: json.result.postcode,
    };
  } catch {
    return null;
  }
}

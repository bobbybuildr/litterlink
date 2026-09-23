import { NextRequest, NextResponse } from "next/server";
import { NO_UK_POSTCODE_MESSAGE, reverseGeocode } from "@/lib/geocode";

function parseCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

/**
 * Server-side proxy for coordinates → nearest UK postcode lookups.
 *
 * Responds with `{ postcode, latitude, longitude, outcode, adminDistrict }`
 * where the coordinates are the *postcode centroid* — callers that started from
 * a user-chosen point must keep their own coordinates as the meeting point.
 */
export async function GET(request: NextRequest) {
  const lat = parseCoordinate(request.nextUrl.searchParams.get("lat"));
  const lng = parseCoordinate(request.nextUrl.searchParams.get("lng"));

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Invalid coordinates." },
      { status: 400 }
    );
  }

  const geo = await reverseGeocode(lat, lng);

  if (!geo) {
    return NextResponse.json({ error: NO_UK_POSTCODE_MESSAGE }, { status: 404 });
  }

  return NextResponse.json(geo);
}

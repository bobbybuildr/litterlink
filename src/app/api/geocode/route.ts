import { NextRequest, NextResponse } from "next/server";
import { geocodePostcode } from "@/lib/geocode";
import { UK_POSTCODE_PATTERN } from "@/lib/constants";

/**
 * Server-side proxy for postcode → coordinates lookups, so the browser never
 * calls postcodes.io directly.
 *
 * Responds with `{ postcode, latitude, longitude, outcode, adminDistrict }`
 * where the coordinates are the postcode centroid.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("postcode")?.trim() ?? "";

  if (!raw || raw.length > 10 || !UK_POSTCODE_PATTERN.test(raw)) {
    return NextResponse.json(
      { error: "Enter a valid UK postcode." },
      { status: 400 }
    );
  }

  const geo = await geocodePostcode(raw);

  if (!geo) {
    return NextResponse.json(
      { error: `Postcode "${raw.toUpperCase()}" wasn't recognised.` },
      { status: 404 }
    );
  }

  return NextResponse.json(geo);
}

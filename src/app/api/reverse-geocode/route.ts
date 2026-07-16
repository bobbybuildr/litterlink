import { NextRequest, NextResponse } from "next/server";

interface PostcodesIoNearestResult {
  postcode?: string;
}

interface PostcodesIoNearestResponse {
  status?: number;
  result?: PostcodesIoNearestResult[];
}

function parseCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const lat = parseCoordinate(request.nextUrl.searchParams.get("lat"));
  const lng = parseCoordinate(request.nextUrl.searchParams.get("lng"));

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Invalid coordinates." },
      { status: 400 }
    );
  }

  const endpoint = `https://api.postcodes.io/postcodes?lon=${encodeURIComponent(String(lng))}&lat=${encodeURIComponent(String(lat))}`;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not resolve postcode from location." },
        { status: 502 }
      );
    }

    const json = (await res.json()) as PostcodesIoNearestResponse;
    const nearestPostcode =
      json.status === 200 && Array.isArray(json.result)
        ? json.result[0]?.postcode ?? null
        : null;

    if (!nearestPostcode) {
      return NextResponse.json(
        { error: "No nearby postcode found for this location." },
        { status: 404 }
      );
    }

    return NextResponse.json({ postcode: nearestPostcode.toUpperCase() });
  } catch {
    return NextResponse.json(
      { error: "Location lookup failed. Please try again." },
      { status: 500 }
    );
  }
}
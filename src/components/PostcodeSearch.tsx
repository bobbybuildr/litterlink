"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LocateFixed, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostcodeSearchProps {
  className?: string;
}

export function PostcodeSearch({ className }: PostcodeSearchProps) {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = postcode.trim().toUpperCase();
    const sp = new URLSearchParams();
    if (trimmed) sp.set("postcode", trimmed);
    router.push(`/events?${sp.toString()}`);
  }

  async function handleUseMyLocation() {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported on this device.");
      return;
    }

    setIsLocating(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const response = await fetch(
        `/api/reverse-geocode?lat=${encodeURIComponent(String(position.coords.latitude))}&lng=${encodeURIComponent(String(position.coords.longitude))}`
      );

      const data = (await response.json()) as { postcode?: string; error?: string };

      if (!response.ok || !data.postcode) {
        setLocationError(data.error ?? "Couldn't find a nearby postcode. Try entering one manually.");
        return;
      }

      setPostcode(data.postcode.toUpperCase());
    } catch (error) {
      const maybeGeoError = error as { code?: number };

      if (maybeGeoError.code === 1) {
        setLocationError("Location permission was denied. You can still enter a postcode.");
      } else if (maybeGeoError.code === 2) {
        setLocationError("Your location couldn't be determined. Try again or enter a postcode.");
      } else if (maybeGeoError.code === 3) {
        setLocationError("Location request timed out. Please try again.");
      } else {
        setLocationError("Couldn't use your location right now. Please try again.");
      }
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <div className={cn("w-full max-w-md", className)}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-0 sm:flex-row"
      >
        <div className="relative flex-1">
          <input
            type="text"
            name="postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="Enter postcode…"
            autoComplete="postal-code"
            className="w-full rounded-t-xl border border-gray-300 bg-white px-4 py-3 pr-34 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:rounded-l-xl sm:rounded-tr-none"
          />
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Use my current location"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" />
            )}
            {isLocating ? "Locating..." : "Use location"}
          </button>
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-b-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark sm:rounded-r-xl sm:rounded-bl-none"
        >
          <Search className="h-4 w-4 shrink-0" />
          Find events
        </button>
      </form>
      {locationError && (
        <p role="status" className="mt-2 text-sm text-amber-700">
          {locationError}
        </p>
      )}
    </div>
  );
}

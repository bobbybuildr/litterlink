"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, LocateFixed, Search, X } from "lucide-react";

const RADIUS_OPTIONS = [
  { label: "5 mi", value: "8" },
  { label: "10 mi", value: "16" },
  { label: "25 mi", value: "40" },
  { label: "50 mi", value: "80" },
];

interface EventsFilterProps {
  defaultFrom?: string;
  defaultTo?: string;
}

export function EventsFilter({ defaultFrom, defaultTo }: EventsFilterProps = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const postcodeInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const postcode = (fd.get("postcode") as string).trim();
    const radius = fd.get("radius") as string;
    const from = fd.get("from") as string;
    const to = fd.get("to") as string;
    const sp = new URLSearchParams();
    if (postcode) sp.set("postcode", postcode.toUpperCase());
    if (radius) sp.set("radius", radius);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    startTransition(() => {
      router.push(`/events?${sp.toString()}`);
    });
  }

  async function handleUseMyLocation() {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation isn\'t supported on this device.");
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
        setLocationError(data.error ?? "Couldn\'t find a nearby postcode. Try entering one manually.");
        return;
      }

      if (postcodeInputRef.current) {
        postcodeInputRef.current.value = data.postcode.toUpperCase();
      }
    } catch (error) {
      const maybeGeoError = error as { code?: number };

      if (maybeGeoError.code === 1) {
        setLocationError("Location permission was denied. You can still enter a postcode.");
      } else if (maybeGeoError.code === 2) {
        setLocationError("Your location couldn\'t be determined. Try again or enter a postcode.");
      } else if (maybeGeoError.code === 3) {
        setLocationError("Location request timed out. Please try again.");
      } else {
        setLocationError("Couldn\'t use your location right now. Please try again.");
      }
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 md:gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex gap-2 md:gap-3 sm:contents">
        <div className="flex-1">
          <label htmlFor="postcode" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Postcode
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={postcodeInputRef}
              id="postcode"
              name="postcode"
              type="text"
              placeholder="e.g. SW1A 1AA"
              autoComplete="postal-code"
              defaultValue={params.get("postcode") ?? ""}
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-32 py-2 text-xs sm:text-sm uppercase placeholder-gray-400 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating || isPending}
              className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
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
          {locationError && (
            <p role="status" className="mt-1 text-xs text-amber-700">
              {locationError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="radius" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Radius
          </label>
          <select
            id="radius"
            name="radius"
            defaultValue={params.get("radius") ?? "16"}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            {RADIUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 md:gap-3 sm:contents">
        <div className="flex-1">
          <label htmlFor="from" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={params.get("from") ?? defaultFrom ?? ""}
            className="w-full rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex-1">
          <label htmlFor="to" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={params.get("to") ?? defaultTo ?? ""}
            className="w-full rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand px-4 py-2 mt-2 sm:mt-0 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60 transition-colors"
      >
        {isPending ? "Searching…" : "Search"}
      </button>

      {(params.get("postcode") || params.get("radius") || params.get("from") || params.get("to")) && (
        <button
          type="button"
          onClick={() => {
            formRef.current?.reset();
            setLocationError(null);
            startTransition(() => router.push("/events"));
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-800 transition-colors"
          title="Reset all filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </form>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { UK_POSTCODE_PATTERN } from "@/lib/constants";
import {
  GEOLOCATION_UNSUPPORTED_MESSAGE,
  geolocationErrorMessage,
  isGeolocationSupported,
  lookupNearestPostcode,
  lookupPostcode,
  requestCurrentPosition,
} from "@/lib/geolocation";
import { cn, normalisePostcode } from "@/lib/utils";

const LocationPickerMap = dynamic(
  () =>
    import("@/components/map/LocationPickerMap").then(
      (m) => m.LocationPickerMap
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-72 w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100"
        aria-hidden="true"
      />
    ),
  }
);

const POSTCODE_DEBOUNCE_MS = 700;
const ADDRESS_LABEL_MAX = 200;

type LocationMode = "postcode" | "pin";
type LookupStatus = "idle" | "locating" | "looking-up";

interface Point {
  latitude: number;
  longitude: number;
}

interface EventLocationPickerProps {
  defaultPostcode?: string;
  defaultLatitude?: string | number | null;
  defaultLongitude?: string | number | null;
  defaultMode?: string;
  defaultAddressLabel?: string;
  /** Lets the parent form block submission while a lookup is unresolved. */
  onReadyChange?: (ready: boolean) => void;
  className?: string;
}

function toCoordinate(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Event location section shared by the create and edit forms.
 *
 * The organiser can type a postcode, use their device location, or click the
 * map. Map and device selections keep the organiser's exact coordinates as the
 * meeting point; the nearest postcode is resolved server-side via
 * /api/reverse-geocode purely for display here — the server action resolves it
 * again authoritatively on submit.
 */
export function EventLocationPicker({
  defaultPostcode,
  defaultLatitude,
  defaultLongitude,
  defaultMode,
  defaultAddressLabel,
  onReadyChange,
  className,
}: EventLocationPickerProps) {
  const postcodeFieldId = useId();
  const addressFieldId = useId();
  const statusId = useId();

  const [postcode, setPostcode] = useState(() =>
    (defaultPostcode ?? "").toUpperCase()
  );
  const [mode, setMode] = useState<LocationMode>(
    defaultMode === "pin" ? "pin" : "postcode"
  );
  const [point, setPoint] = useState<Point | null>(() => {
    const latitude = toCoordinate(defaultLatitude);
    const longitude = toCoordinate(defaultLongitude);
    return latitude !== null && longitude !== null
      ? { latitude, longitude }
      : null;
  });
  const [confirmedPostcode, setConfirmedPostcode] = useState<string | null>(
    () => (defaultPostcode ? defaultPostcode.toUpperCase() : null)
  );
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Every lookup takes a ticket; only the newest one may apply its result, so a
  // slow earlier request can never overwrite a newer selection.
  const requestRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startRequest(): number {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    return ++requestRef.current;
  }

  function isCurrent(requestId: number): boolean {
    return requestRef.current === requestId;
  }

  async function resolvePostcode(value: string, normaliseInput = false) {
    const trimmed = value.trim();
    if (!UK_POSTCODE_PATTERN.test(trimmed)) return;

    const requestId = startRequest();
    setStatus("looking-up");

    const result = await lookupPostcode(trimmed);
    if (!isCurrent(requestId)) return;

    if (!result.ok) {
      setConfirmedPostcode(null);
      setError(result.error);
    } else {
      setMode("postcode");
      setPoint({ latitude: result.latitude, longitude: result.longitude });
      setConfirmedPostcode(result.postcode);
      setError(null);
      if (normaliseInput) setPostcode(result.postcode);
    }

    setStatus("idle");
  }

  async function applyPoint(
    requestId: number,
    latitude: number,
    longitude: number
  ) {
    setMode("pin");
    setPoint({ latitude, longitude });
    setConfirmedPostcode(null);
    setError(null);
    setStatus("looking-up");

    const result = await lookupNearestPostcode(latitude, longitude);
    if (!isCurrent(requestId)) return;

    if (!result.ok) {
      setError(result.error);
    } else {
      setPostcode(result.postcode);
      setConfirmedPostcode(result.postcode);
    }

    setStatus("idle");
  }

  function handleMapSelect(latitude: number, longitude: number) {
    void applyPoint(startRequest(), latitude, longitude);
  }

  function handlePostcodeChange(value: string) {
    const next = value.toUpperCase();
    // Typing makes the postcode authoritative again and cancels older lookups.
    startRequest();
    setPostcode(next);
    setMode("postcode");
    setConfirmedPostcode(null);
    setStatus("idle");
    setError(null);

    if (!UK_POSTCODE_PATTERN.test(next.trim())) return;

    debounceRef.current = setTimeout(() => {
      void resolvePostcode(next);
    }, POSTCODE_DEBOUNCE_MS);
  }

  function handlePostcodeBlur() {
    if (mode !== "postcode") return;
    if (
      confirmedPostcode &&
      normalisePostcode(confirmedPostcode) === normalisePostcode(postcode)
    ) {
      return;
    }
    void resolvePostcode(postcode, true);
  }

  async function handleUseMyLocation() {
    setError(null);

    if (!isGeolocationSupported()) {
      setError(GEOLOCATION_UNSUPPORTED_MESSAGE);
      return;
    }

    const requestId = startRequest();
    setStatus("locating");

    let position: GeolocationPosition;
    try {
      position = await requestCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      });
    } catch (geolocationError) {
      if (!isCurrent(requestId)) return;
      setError(geolocationErrorMessage(geolocationError));
      setStatus("idle");
      return;
    }

    if (!isCurrent(requestId)) return;

    await applyPoint(
      requestId,
      position.coords.latitude,
      position.coords.longitude
    );
  }

  // Show the map straight away when the form opens with a postcode but no
  // coordinates (e.g. a duplicated event, or a rejected submission).
  const didInitialiseRef = useRef(false);
  useEffect(() => {
    if (didInitialiseRef.current) return;
    didInitialiseRef.current = true;
    if (point || !postcode) return;
    void resolvePostcode(postcode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const isBusy = status !== "idle";
  // A pin without a resolved postcode cannot be stored, so hold the form back.
  const isReady = !isBusy && !(mode === "pin" && !confirmedPostcode);

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  let statusMessage: string;
  if (status === "locating") {
    statusMessage = "Finding your location…";
  } else if (status === "looking-up") {
    statusMessage = "Looking up the nearest postcode…";
  } else if (point && confirmedPostcode) {
    statusMessage =
      mode === "pin"
        ? `Meeting point set — nearest postcode ${confirmedPostcode}`
        : `Location set — ${confirmedPostcode}`;
  } else {
    statusMessage =
      "Enter a postcode, use your current location, or choose the meeting point on the map.";
  }

  return (
    <fieldset className={cn("space-y-4", className)}>
      <legend className="text-sm font-semibold text-gray-900">
        Event location
      </legend>
      <p className="text-sm text-gray-500">
        Enter a postcode, use your current location, or choose the meeting point
        on the map.
      </p>

        <div>
          <label
            htmlFor={postcodeFieldId}
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Postcode *
            <span className="ml-1 font-normal text-gray-400">
              (fills in automatically from the map)
            </span>
          </label>
          <div className="relative">
            <input
              id={postcodeFieldId}
              name="postcode"
              type="text"
              required
              autoComplete="postal-code"
              value={postcode}
              onChange={(e) => handlePostcodeChange(e.target.value)}
              onBlur={handlePostcodeBlur}
              aria-describedby={statusId}
              placeholder="SW1A 1AA"
              className={cn(inputCls, "uppercase pr-32")}
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isBusy}
              className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
              title="Use my current location"
            >
              {status === "locating" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" />
              )}
              {status === "locating" ? "Locating..." : "Use current location"}
            </button>
          </div>
        </div>

      <div>
        <p className="text-sm font-medium text-gray-700">Meeting point</p>
        <p className="mb-2 text-xs text-gray-500">
          Click the map to choose the exact meeting point, then drag the marker
          to fine-tune it. The pin marks where people should meet, not the whole
          area you&apos;ll be covering.
        </p>
        <LocationPickerMap
          latitude={point?.latitude ?? null}
          longitude={point?.longitude ?? null}
          onSelect={handleMapSelect}
        />
      </div>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-start gap-2 text-sm",
          point && confirmedPostcode && !isBusy
            ? "text-gray-700"
            : "text-gray-500"
        )}
      >
        {isBusy ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        {statusMessage}
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {error}
        </p>
      )}

      <input
        type="hidden"
        name="latitude"
        value={point ? String(point.latitude) : ""}
      />
      <input
        type="hidden"
        name="longitude"
        value={point ? String(point.longitude) : ""}
      />
      <input type="hidden" name="location_mode" value={mode} />

      <div>
          <label
            htmlFor={addressFieldId}
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Meeting point description
            <span className="ml-1 font-normal text-gray-400">
              (Where should attendees meet)
            </span>
          </label>
          <input
            id={addressFieldId}
            name="address_label"
            type="text"
            maxLength={ADDRESS_LABEL_MAX}
            defaultValue={defaultAddressLabel ?? ""}
            placeholder="Meet by the lifeguard station"
            className={inputCls}
          />
        </div>
    </fieldset>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

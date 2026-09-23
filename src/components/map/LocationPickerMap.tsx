"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number, longitude: number) => void;
  className?: string;
}

const UK_CENTRE: [number, number] = [53.15, -3.6];
const UK_ZOOM = 6;
const MIN_PIN_ZOOM = 14;
const PIN_ZOOM = 16;

/**
 * Leaflet map used to pick an exact meeting point. Click or tap anywhere to
 * move the marker; the marker can also be dragged.
 * Lazy-imports Leaflet to avoid SSR issues with window/document.
 */
export function LocationPickerMap({
  latitude,
  longitude,
  onSelect,
  className,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Kept in refs so the map is only ever created once.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const initialPointRef = useRef<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cleanedUp = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cleanedUp || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "/images/marker-icon.png",
        iconRetinaUrl: "/images/marker-icon-2x.png",
        shadowUrl: "/images/marker-shadow.png",
      });

      const initialPoint = initialPointRef.current;
      const map = L.map(containerRef.current, {
        // Let the page keep scrolling when the wheel passes over the map.
        scrollWheelZoom: false,
      }).setView(initialPoint ?? UK_CENTRE, initialPoint ? PIN_ZOOM : UK_ZOOM);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        onSelectRef.current(e.latlng.lat, e.latlng.lng);
      });

      leafletRef.current = L;
      mapRef.current = map;
      setIsReady(true);
    }

    initMap();

    return () => {
      cleanedUp = true;
      markerRef.current = null;
      leafletRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep the marker and viewport in step with the selected point.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!isReady || !map || !L) return;

    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], {
        draggable: true,
        keyboard: true,
        title: "Event meeting point",
        alt: "Event meeting point",
      }).addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onSelectRef.current(lat, lng);
      });

      markerRef.current = marker;
    }

    // Only move the viewport when the point is off-screen or too far out to
    // place a pin accurately — otherwise the map would jump under the cursor.
    if (
      map.getZoom() < MIN_PIN_ZOOM ||
      !map.getBounds().contains([latitude, longitude])
    ) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), PIN_ZOOM));
    }
  }, [isReady, latitude, longitude]);

  return (
    <div className={cn("relative h-72 w-full", className)}>
      <div
        ref={containerRef}
        role="region"
        aria-label="Map — click or tap to choose the event meeting point"
        // Leaflet's own CSS sets .leaflet-container to height:100%, loaded
        // after Tailwind's utilities — a fixed height class here would lose
        // that cascade fight, so the fixed size lives on the wrapper instead.
        className="h-full w-full rounded-xl border border-gray-200"
      />
    </div>
  );
}

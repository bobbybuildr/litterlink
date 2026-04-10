"use client";

import { useEffect, useRef } from "react";
import type { EventWithCount } from "@/lib/events";

interface EventsMapProps {
  events: EventWithCount[];
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
}

function radiusToZoom(radiusKm?: number): number {
  if (!radiusKm) return 11;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 20) return 11;
  if (radiusKm <= 50) return 9;
  return 8;
}

/**
 * Leaflet map rendered client-side.
 * Lazy-imports Leaflet to avoid SSR issues with window/document.
 */
export function EventsMap({ events, centerLat, centerLng, radiusKm }: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  // const hintRef = useRef<HTMLDivElement>(null);
  // const touchCleanupRef = useRef<(() => void) | null>(null);

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

      const defaultLat = centerLat ?? 53.15;
      const defaultLng = centerLng ?? -3.6;
      const defaultZoom = centerLat != null ? radiusToZoom(radiusKm) : 6;

      const map = L.map(containerRef.current!).setView(
        [defaultLat, defaultLng],
        defaultZoom
      );
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      events.forEach((event) => {
        const date = new Date(event.starts_at).toLocaleDateString("en-GB", {
          timeZone: "Europe/London",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        L.marker([event.latitude, event.longitude])
          .addTo(map)
          .bindPopup(
            `<div style="min-width:160px">
              <strong style="font-size:0.875rem">${event.title}</strong>
              <p style="margin:4px 0 0;font-size:0.75rem;color:#6b7280">${date}</p>
              <p style="margin:2px 0 0;font-size:0.75rem;color:#6b7280">${event.address_label ?? event.location_postcode}</p>
              <a href="/events/${event.id}" style="display:inline-block;margin-top:8px;font-size:0.75rem;color:#16a34a;font-weight:600">
                View event →
              </a>
            </div>`
          );
      });

      // Mobile gesture handling: disabled for now, may re-enable later.
      // let hintTimeout: ReturnType<typeof setTimeout> | null = null;
      //
      // const showHint = () => {
      //   if (hintRef.current) hintRef.current.style.opacity = "1";
      //   if (hintTimeout) clearTimeout(hintTimeout);
      //   hintTimeout = setTimeout(() => {
      //     if (hintRef.current) hintRef.current.style.opacity = "0";
      //   }, 1500);
      // };
      //
      // const hideHint = () => {
      //   if (hintRef.current) hintRef.current.style.opacity = "0";
      //   if (hintTimeout) { clearTimeout(hintTimeout); hintTimeout = null; }
      // };
      //
      // const onTouchStart = (e: TouchEvent) => {
      //   if (e.touches.length >= 2) {
      //     map.dragging.enable();
      //     hideHint();
      //   } else {
      //     map.dragging.disable();
      //     showHint();
      //   }
      // };
      //
      // const onTouchEnd = () => {
      //   map.dragging.enable();
      // };
      //
      // const el = containerRef.current!;
      // el.addEventListener("touchstart", onTouchStart, { passive: true });
      // el.addEventListener("touchend", onTouchEnd, { passive: true });
      //
      // touchCleanupRef.current = () => {
      //   el.removeEventListener("touchstart", onTouchStart);
      //   el.removeEventListener("touchend", onTouchEnd);
      //   if (hintTimeout) clearTimeout(hintTimeout);
      // };
    }

    initMap();

    return () => {
      cleanedUp = true;
      // touchCleanupRef.current?.();
      // touchCleanupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When events change (filter applied), update markers without re-creating the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    async function updateMarkers() {
      const L = (await import("leaflet")).default;
      if (!map) return;

      // Remove all existing markers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });

      events.forEach((event) => {
        const date = new Date(event.starts_at).toLocaleDateString("en-GB", {
          timeZone: "Europe/London",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        L.marker([event.latitude, event.longitude])
          .addTo(map)
          .bindPopup(
            `<div style="min-width:160px">
              <strong style="font-size:0.875rem">${event.title}</strong>
              <p style="margin:4px 0 0;font-size:0.75rem;color:#6b7280">${date}</p>
              <p style="margin:2px 0 0;font-size:0.75rem;color:#6b7280">${event.address_label ?? event.location_postcode}</p>
              <a href="/events/${event.id}" style="display:inline-block;margin-top:8px;font-size:0.75rem;color:#16a34a;font-weight:600">
                View event →
              </a>
            </div>`
          );
      });

      if (centerLat != null && centerLng != null) {
        map.setView([centerLat, centerLng], radiusToZoom(radiusKm));
      }
    }

    updateMarkers();
  }, [events, centerLat, centerLng, radiusKm]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full rounded-xl"
        aria-label="Map of litter-picking events"
      />
      {/* Gesture hint shown on single-finger touch; hidden by default */}
      {/* <div
        ref={hintRef}
        style={{ opacity: 0, transition: "opacity 0.3s ease" }}
        className="pointer-events-none absolute inset-0 z-1000 flex items-center justify-center rounded-xl bg-black/40"
        aria-hidden="true"
      >
        <p className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-700">
          Use two fingers to move the map
        </p>
      </div> */}
    </div>
  );
}

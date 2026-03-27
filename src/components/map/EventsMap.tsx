"use client";

import { useEffect, useRef } from "react";
import type { EventWithCount } from "@/lib/events";

interface EventsMapProps {
  events: EventWithCount[];
  centerLat?: number;
  centerLng?: number;
}

/**
 * Leaflet map rendered client-side.
 * Lazy-imports Leaflet to avoid SSR issues with window/document.
 */
export function EventsMap({ events, centerLat, centerLng }: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cleanedUp = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cleanedUp || !containerRef.current) return;

      // Fix Leaflet's default marker icon path broken by bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const defaultLat = centerLat ?? 51.505;
      const defaultLng = centerLng ?? -0.09;
      const defaultZoom = centerLat != null ? 11 : 6;

      const map = L.map(containerRef.current!).setView(
        [defaultLat, defaultLng],
        defaultZoom
      );
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      events.forEach((event) => {
        const date = new Date(event.starts_at).toLocaleDateString("en-GB", {
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
    }

    initMap();

    return () => {
      cleanedUp = true;
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
        map.setView([centerLat, centerLng], 11);
      }
    }

    updateMarkers();
  }, [events, centerLat, centerLng]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-xl"
      aria-label="Map of litter-picking events"
    />
  );
}

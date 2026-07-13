"use client";

import { useEffect, useRef } from "react";
import type { GroupWithCounts } from "@/lib/events";
import { GROUP_TYPE_LABELS } from "@/lib/constants";

interface GroupsMapProps {
  groups: GroupWithCounts[];
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

function popupHtml(group: GroupWithCounts): string {
  const typeLabel = GROUP_TYPE_LABELS[group.group_type] ?? "Organisation";
  const locationLabel = group.location_name ?? group.location_postcode ?? "";

  return `<div style="min-width:170px">
      <strong style="font-size:0.875rem">${group.name}</strong>
      <p style="margin:4px 0 0;font-size:0.75rem;color:#6b7280">${typeLabel}${locationLabel ? ` · ${locationLabel}` : ""}</p>
      <p style="margin:2px 0 0;font-size:0.75rem;color:#6b7280">${group.member_count} member${group.member_count !== 1 ? "s" : ""} · ${group.upcoming_event_count} upcoming event${group.upcoming_event_count !== 1 ? "s" : ""}</p>
      <a href="/groups/${group.slug}" style="display:inline-block;margin-top:8px;font-size:0.75rem;color:#16a34a;font-weight:600">
        View group →
      </a>
    </div>`;
}

/**
 * Leaflet map of groups, rendered client-side.
 * Lazy-imports Leaflet to avoid SSR issues with window/document.
 */
export function GroupsMap({ groups, centerLat, centerLng, radiusKm }: GroupsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

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

      groups.forEach((group) => {
        if (group.latitude == null || group.longitude == null) return;
        L.marker([group.latitude, group.longitude])
          .addTo(map)
          .bindPopup(popupHtml(group));
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

  // When groups change (filter applied), update markers without re-creating the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    async function updateMarkers() {
      const L = (await import("leaflet")).default;
      if (!map) return;

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });

      groups.forEach((group) => {
        if (group.latitude == null || group.longitude == null) return;
        L.marker([group.latitude, group.longitude])
          .addTo(map)
          .bindPopup(popupHtml(group));
      });

      if (centerLat != null && centerLng != null) {
        map.setView([centerLat, centerLng], radiusToZoom(radiusKm));
      }
    }

    updateMarkers();
  }, [groups, centerLat, centerLng, radiusKm]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full rounded-xl"
        aria-label="Map of litter-picking groups"
      />
    </div>
  );
}

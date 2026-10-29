import type { Database } from "@/types/database";

// Client-safe: imported by the map Client Components and by the pages that build their props.
// Props passed to a Client Component are serialised into the page, so the maps must only be given what they draw.

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

export type EventPin = Pick<
  EventRow,
  "id" | "title" | "starts_at" | "latitude" | "longitude" | "address_label" | "location_postcode"
>;

export type GroupPin = Pick<
  GroupRow,
  "id" | "name" | "slug" | "group_type" | "latitude" | "longitude" | "location_name" | "location_postcode"
> & {
  member_count?: number;
  upcoming_event_count?: number;
};

export function toEventPins(events: EventPin[]): EventPin[] {
  return events.map(({ id, title, starts_at, latitude, longitude, address_label, location_postcode }) => ({
    id,
    title,
    starts_at,
    latitude,
    longitude,
    address_label,
    location_postcode,
  }));
}

/** Groups without coordinates never get a marker, so they are left out rather than sent for nothing. */
export function toGroupPins(groups: GroupPin[]): GroupPin[] {
  return groups
    .filter((group) => group.latitude != null && group.longitude != null)
    .map(
      ({
        id,
        name,
        slug,
        group_type,
        latitude,
        longitude,
        location_name,
        location_postcode,
        member_count,
        upcoming_event_count,
      }) => ({
        id,
        name,
        slug,
        group_type,
        latitude,
        longitude,
        location_name,
        location_postcode,
        member_count,
        upcoming_event_count,
      })
    );
}

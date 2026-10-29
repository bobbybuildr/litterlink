import { describe, expect, it } from "vitest";
import { toEventPins, toGroupPins } from "@/lib/map-pins";

const fullEventRow = {
  id: "event-1",
  title: "Beach clean",
  starts_at: "2026-11-01T10:00:00Z",
  latitude: 50.82,
  longitude: -0.14,
  address_label: "Brighton seafront",
  location_postcode: "BN1 1AA",
  description: "A long description that the map never shows.",
  organiser_contact_details: "07700 900123",
  organiser_name: "Sam",
  organiser_avatar: "https://example.com/avatar.webp",
  organiser_is_verified: true,
  confirmed_count: 12,
  group_name: "Brighton Pickers",
  event_stats: { bags_collected: 4 },
};

const fullGroupRow = {
  id: "group-1",
  name: "Brighton Pickers",
  slug: "brighton-pickers",
  group_type: "community",
  latitude: 50.82,
  longitude: -0.14,
  location_name: "Brighton",
  location_postcode: "BN1 1AA",
  member_count: 8,
  upcoming_event_count: 2,
  description: "A long description that the map never shows.",
  contact_email: "hello@example.com",
  website_url: "https://example.com",
  logo_url: "https://example.com/logo.webp",
  activity_score: 31,
};

describe("toEventPins", () => {
  it("keeps only the fields a marker and its popup use", () => {
    const [pin] = toEventPins([fullEventRow]);

    expect(Object.keys(pin).sort()).toEqual(
      ["address_label", "id", "latitude", "location_postcode", "longitude", "starts_at", "title"].sort()
    );
    expect(pin).toEqual({
      id: "event-1",
      title: "Beach clean",
      starts_at: "2026-11-01T10:00:00Z",
      latitude: 50.82,
      longitude: -0.14,
      address_label: "Brighton seafront",
      location_postcode: "BN1 1AA",
    });
  });

  it("keeps the order and returns an empty list for no events", () => {
    const pins = toEventPins([
      { ...fullEventRow, id: "b" },
      { ...fullEventRow, id: "a" },
    ]);
    expect(pins.map((pin) => pin.id)).toEqual(["b", "a"]);
    expect(toEventPins([])).toEqual([]);
  });

  it("keeps a null address label so the popup can fall back to the postcode", () => {
    const [pin] = toEventPins([{ ...fullEventRow, address_label: null }]);
    expect(pin.address_label).toBeNull();
  });
});

describe("toGroupPins", () => {
  it("keeps only the fields a marker and its popup use", () => {
    const [pin] = toGroupPins([fullGroupRow]);

    expect(Object.keys(pin).sort()).toEqual(
      [
        "group_type",
        "id",
        "latitude",
        "location_name",
        "location_postcode",
        "longitude",
        "member_count",
        "name",
        "slug",
        "upcoming_event_count",
      ].sort()
    );
    expect(pin).toMatchObject({ slug: "brighton-pickers", member_count: 8, upcoming_event_count: 2 });
  });

  it("drops groups that have no coordinates", () => {
    const pins = toGroupPins([
      fullGroupRow,
      { ...fullGroupRow, id: "no-lat", latitude: null },
      { ...fullGroupRow, id: "no-lng", longitude: null },
    ]);
    expect(pins.map((pin) => pin.id)).toEqual(["group-1"]);
  });

  it("accepts a plain group row that has no counts", () => {
    const { member_count, upcoming_event_count, ...row } = fullGroupRow;
    void member_count;
    void upcoming_event_count;

    const [pin] = toGroupPins([row]);
    expect(pin.member_count).toBeUndefined();
    expect(pin.upcoming_event_count).toBeUndefined();
    expect(pin.slug).toBe("brighton-pickers");
  });
});

import { describe, expect, it } from "vitest";
import { eventShareCard, fitShareTitle, formatShareDate, groupShareCard } from "@/lib/share-image";

const NOW = new Date("2026-10-15T10:00:00Z");

const event = {
  title: "Community Litter Pick",
  status: "published" as const,
  starts_at: "2026-10-24T09:00:00Z",
  ends_at: "2026-10-24T11:00:00Z",
  address_label: "Sanders Park, Bromsgrove",
  location_postcode: "B61 7DR",
  location_admin_district: "Bromsgrove",
  group_name: "Bromsgrove Litter Heroes",
  organiser_name: "Jo Bloggs",
};

describe("fitShareTitle", () => {
  it("uses the largest size for short titles", () => {
    expect(fitShareTitle("Community Litter Pick")).toEqual({ text: "Community Litter Pick", fontSize: 80 });
  });

  it("steps the size down as titles grow", () => {
    const sizes = [20, 40, 60, 90].map((n) => fitShareTitle("word ".repeat(n / 5).trim()).fontSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(sizes.at(-1)).toBe(46);
  });

  it("caps very long titles on a word boundary", () => {
    const { text } = fitShareTitle("Beach clean ".repeat(12));
    expect(text.length).toBeLessThanOrEqual(100);
    expect(text.endsWith("…")).toBe(true);
  });

  it("collapses stray whitespace", () => {
    expect(fitShareTitle("  Park\n  tidy  ").text).toBe("Park tidy");
  });
});

describe("formatShareDate", () => {
  it("shows the London day and time range", () => {
    expect(formatShareDate(event.starts_at, event.ends_at, NOW)).toBe("Saturday 24 October, 10:00–12:00");
  });

  it("uses GMT after the clocks change", () => {
    expect(formatShareDate("2026-11-07T10:00:00Z", null, NOW)).toBe("Saturday 7 November, 10:00");
  });

  it("adds the year for events outside the current year", () => {
    expect(formatShareDate("2027-01-09T10:00:00Z", null, NOW)).toBe("Saturday 9 January 2027, 10:00");
  });

  it("only shows the start time when the event ends on another day", () => {
    expect(formatShareDate("2026-10-24T09:00:00Z", "2026-10-25T09:00:00Z", NOW)).toBe("Saturday 24 October, 10:00");
  });
});

describe("eventShareCard", () => {
  it("builds an invitation for upcoming events", () => {
    expect(eventShareCard(event, NOW)).toEqual({
      badge: { label: "Upcoming litter pick", tone: "brand" },
      title: "Community Litter Pick",
      details: [
        { icon: "pin", text: "Sanders Park, Bromsgrove" },
        { icon: "calendar", text: "Saturday 24 October, 10:00–12:00" },
      ],
      host: "Hosted by Bromsgrove Litter Heroes",
    });
  });

  it("marks cancelled and completed events so they don't read as invitations", () => {
    expect(eventShareCard({ ...event, status: "cancelled" }, NOW).badge).toEqual({
      label: "Event cancelled",
      tone: "danger",
    });
    expect(eventShareCard({ ...event, status: "completed" }, NOW).badge.label).toBe("Completed litter pick");
    const past = { ...event, starts_at: "2026-10-01T09:00:00Z", ends_at: null };
    expect(eventShareCard(past, NOW).badge.label).toBe("Past litter pick");
  });

  it("falls back to the postcode and organiser", () => {
    const card = eventShareCard({ ...event, address_label: null, group_name: null }, NOW);
    expect(card.details[0].text).toBe("B61 7DR, Bromsgrove");
    expect(card.host).toBe("Hosted by Jo Bloggs");
  });

  it("adds the district unless the meeting point already names it", () => {
    expect(eventShareCard({ ...event, address_label: "Sanders Park" }, NOW).details[0].text).toBe(
      "Sanders Park, Bromsgrove"
    );
    expect(
      eventShareCard({ ...event, address_label: "Castle Park", location_admin_district: "Bristol, City of" }, NOW)
        .details[0].text
    ).toBe("Castle Park, Bristol");
    expect(
      eventShareCard({ ...event, address_label: null, location_admin_district: null }, NOW).details[0].text
    ).toBe("B61 7DR");
  });

  it("omits the host when the organiser account has gone", () => {
    expect(eventShareCard({ ...event, group_name: null, organiser_name: null }, NOW).host).toBeNull();
  });
});

describe("groupShareCard", () => {
  const group = {
    name: "Bromsgrove Litter Heroes",
    group_type: "community",
    location_name: "Bromsgrove, Worcestershire",
    location_postcode: "B61 7DR",
  };

  it("shows the group name, location and type", () => {
    expect(groupShareCard(group)).toEqual({
      badge: { label: "Litter picking group", tone: "brand" },
      title: "Bromsgrove Litter Heroes",
      details: [
        { icon: "pin", text: "Bromsgrove, Worcestershire" },
        { icon: "users", text: "Community group" },
      ],
      host: null,
    });
  });

  it("falls back to the postcode, then drops the location line", () => {
    expect(groupShareCard({ ...group, location_name: null }).details[0].text).toBe("B61 7DR");
    expect(groupShareCard({ ...group, location_name: null, location_postcode: null }).details).toEqual([
      { icon: "users", text: "Community group" },
    ]);
  });

  it("labels unknown group types as an organisation", () => {
    expect(groupShareCard({ ...group, group_type: "mystery" }).details.at(-1)?.text).toBe("Organisation");
  });

  it("limits long location names to one line", () => {
    const { details } = groupShareCard({ ...group, location_name: "Riverside Meadows ".repeat(8) });
    expect(details[0].text.length).toBeLessThanOrEqual(70);
  });
});

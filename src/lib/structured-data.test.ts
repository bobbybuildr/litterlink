import { describe, expect, it } from "vitest";
import { jsonLd } from "@/lib/html";
import { absoluteUrl, SOCIAL_PROFILES } from "@/lib/seo";
import {
  breadcrumbJsonLd,
  eventJsonLd,
  groupOrganizationJsonLd,
  jsonLdGraph,
  SITE_ORGANIZATION_ID,
  siteOrganizationJsonLd,
  WEBSITE_ID,
  websiteJsonLd,
  type EventJsonLdFields,
  type GroupJsonLdFields,
} from "@/lib/structured-data";

const NOW = new Date("2026-10-15T10:00:00Z");
const EVENT_ID = "7d1f4c1e-2b1a-4c55-9a51-0d2b6f1c9e10";
const EVENT_URL = absoluteUrl(`/events/${EVENT_ID}`);

const event: EventJsonLdFields = {
  id: EVENT_ID,
  title: "Sanders Park Litter Pick",
  description: "Meet by the bandstand. Gloves and pickers provided.",
  status: "published",
  starts_at: "2026-10-24T09:00:00+00:00",
  ends_at: "2026-10-24T11:00:00+00:00",
  created_at: "2026-10-01T12:00:00+00:00",
  latitude: 52.3354,
  longitude: -2.0612,
  address_label: "Sanders Park bandstand",
  location_postcode: "B61 7DR",
  location_admin_district: "Bromsgrove",
  max_attendees: 20,
  confirmed_count: 5,
  organiser_name: "Jo Bloggs",
  group_name: "Bromsgrove Litter Heroes",
  group_slug: "bromsgrove-litter-heroes",
};

/** Mirrors what search engines see: undefined properties are dropped on serialisation. */
function serialised<T>(value: T): T {
  return JSON.parse(jsonLd(value));
}

describe("site structured data", () => {
  it("describes LitterLink with its logo, contact email and social profiles", () => {
    expect(siteOrganizationJsonLd()).toMatchObject({
      "@type": "Organization",
      "@id": SITE_ORGANIZATION_ID,
      name: "LitterLink",
      url: absoluteUrl("/"),
      logo: { "@type": "ImageObject", url: absoluteUrl("/android-chrome-512x512.png"), width: 512, height: 512 },
      email: "hello@litterlink.co.uk",
      sameAs: Object.values(SOCIAL_PROFILES),
    });
  });

  it("links the WebSite to its publisher by @id", () => {
    expect(websiteJsonLd()).toMatchObject({
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: absoluteUrl("/"),
      inLanguage: "en-GB",
      publisher: { "@id": SITE_ORGANIZATION_ID },
    });
    expect(websiteJsonLd()).not.toHaveProperty("potentialAction");
  });
});

describe("jsonLdGraph", () => {
  it("wraps nodes in one schema.org graph and skips missing ones", () => {
    expect(jsonLdGraph([websiteJsonLd(), null, undefined])).toEqual({
      "@context": "https://schema.org",
      "@graph": [websiteJsonLd()],
    });
  });

  it("returns null when there is nothing to render", () => {
    expect(jsonLdGraph([null])).toBeNull();
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers items from 1 with absolute URLs", () => {
    expect(
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Events", path: "/events" },
        { name: event.title, path: `/events/${EVENT_ID}` },
      ])
    ).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Events", item: absoluteUrl("/events") },
        { "@type": "ListItem", position: 3, name: event.title, item: EVENT_URL },
      ],
    });
  });
});

describe("eventJsonLd", () => {
  it("describes an upcoming in-person event with location, organiser, capacity and a free offer", () => {
    expect(serialised(eventJsonLd(event, NOW))).toEqual({
      "@type": "Event",
      "@id": `${EVENT_URL}#event`,
      name: "Sanders Park Litter Pick",
      description: "Meet by the bandstand. Gloves and pickers provided.",
      url: EVENT_URL,
      image: [`${EVENT_URL}/opengraph-image`],
      startDate: "2026-10-24T09:00:00.000Z",
      endDate: "2026-10-24T11:00:00.000Z",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: "Sanders Park bandstand",
        address: { "@type": "PostalAddress", postalCode: "B61 7DR", addressLocality: "Bromsgrove", addressCountry: "GB" },
        geo: { "@type": "GeoCoordinates", latitude: 52.3354, longitude: -2.0612 },
      },
      organizer: {
        "@type": "Organization",
        "@id": absoluteUrl("/groups/bromsgrove-litter-heroes#organization"),
        name: "Bromsgrove Litter Heroes",
        url: absoluteUrl("/groups/bromsgrove-litter-heroes"),
      },
      isAccessibleForFree: true,
      maximumAttendeeCapacity: 20,
      remainingAttendeeCapacity: 15,
      offers: {
        "@type": "Offer",
        price: 0,
        priceCurrency: "GBP",
        availability: "https://schema.org/InStock",
        url: EVENT_URL,
        validFrom: "2026-10-01T12:00:00.000Z",
      },
    });
  });

  it("references the group's Organization node by the same @id the group page uses", () => {
    const organizer = eventJsonLd(event, NOW)?.organizer as { "@id": string };
    const group = groupOrganizationJsonLd({
      name: "Bromsgrove Litter Heroes",
      slug: "bromsgrove-litter-heroes",
      description: null,
      logo_url: null,
      website_url: null,
      social_url: null,
      contact_email: null,
      location_name: null,
      location_postcode: null,
      latitude: null,
      longitude: null,
    });
    expect(organizer["@id"]).toBe(group["@id"]);
  });

  it("falls back to the organiser as a Person without a profile URL", () => {
    const organizer = eventJsonLd({ ...event, group_name: null, group_slug: null }, NOW)?.organizer;
    expect(organizer).toEqual({ "@type": "Person", name: "Jo Bloggs" });
  });

  it("omits the organiser when neither a group nor an organiser name is known", () => {
    const node = serialised(eventJsonLd({ ...event, group_name: null, group_slug: null, organiser_name: null }, NOW));
    expect(node).not.toHaveProperty("organizer");
  });

  it("marks a full upcoming event as sold out", () => {
    const node = eventJsonLd({ ...event, confirmed_count: 22 }, NOW);
    expect(node).toMatchObject({
      remainingAttendeeCapacity: 0,
      offers: { availability: "https://schema.org/SoldOut" },
    });
  });

  it("leaves capacity out when there is no limit", () => {
    const node = serialised(eventJsonLd({ ...event, max_attendees: null }, NOW));
    expect(node).not.toHaveProperty("maximumAttendeeCapacity");
    expect(node).not.toHaveProperty("remainingAttendeeCapacity");
    expect(node).toMatchObject({ offers: { availability: "https://schema.org/InStock" } });
  });

  it("marks cancelled events and drops the offer", () => {
    const node = serialised(eventJsonLd({ ...event, status: "cancelled" }, NOW));
    expect(node).toMatchObject({ eventStatus: "https://schema.org/EventCancelled" });
    expect(node).not.toHaveProperty("offers");
    expect(node).not.toHaveProperty("remainingAttendeeCapacity");
  });

  it("keeps completed and past events scheduled without an offer", () => {
    for (const past of [
      { ...event, status: "completed" as const },
      { ...event, starts_at: "2026-10-01T09:00:00Z", ends_at: "2026-10-01T11:00:00Z" },
    ]) {
      const node = serialised(eventJsonLd(past, NOW));
      expect(node).toMatchObject({ eventStatus: "https://schema.org/EventScheduled", maximumAttendeeCapacity: 20 });
      expect(node).not.toHaveProperty("offers");
      expect(node).not.toHaveProperty("remainingAttendeeCapacity");
    }
  });

  it("returns null for drafts", () => {
    expect(eventJsonLd({ ...event, status: "draft" }, NOW)).toBeNull();
  });

  it("omits a missing or invalid end date", () => {
    expect(serialised(eventJsonLd({ ...event, ends_at: null }, NOW))).not.toHaveProperty("endDate");
    expect(serialised(eventJsonLd({ ...event, ends_at: event.starts_at }, NOW))).not.toHaveProperty("endDate");
  });

  it("names the place by postcode and writes a description when the organiser left them blank", () => {
    const node = serialised(
      eventJsonLd({ ...event, description: null, address_label: null, location_admin_district: "Bristol, City of" }, NOW)
    );
    expect(node).toMatchObject({
      description: "A community litter pick at B61 7DR, Bristol.",
      location: { name: "B61 7DR", address: { addressLocality: "Bristol" } },
    });
  });
});

describe("groupOrganizationJsonLd", () => {
  const group: GroupJsonLdFields = {
    name: "Bromsgrove Litter Heroes",
    slug: "bromsgrove-litter-heroes",
    description: "Monthly picks around Bromsgrove.",
    logo_url: "https://example.supabase.co/storage/v1/object/public/group-logos/abc.webp",
    website_url: "https://bromsgrovelitterheroes.org",
    social_url: "https://facebook.com/bromsgrovelitterheroes",
    contact_email: "hello@bromsgrovelitterheroes.org",
    location_name: "Bromsgrove",
    location_postcode: "B61 7DR",
    latitude: 52.3354,
    longitude: -2.0612,
  };

  it("describes the group with its logo, links and location", () => {
    const url = absoluteUrl("/groups/bromsgrove-litter-heroes");
    expect(serialised(groupOrganizationJsonLd(group))).toEqual({
      "@type": "Organization",
      "@id": `${url}#organization`,
      name: "Bromsgrove Litter Heroes",
      url,
      description: "Monthly picks around Bromsgrove.",
      logo: group.logo_url,
      email: "hello@bromsgrovelitterheroes.org",
      sameAs: ["https://bromsgrovelitterheroes.org", "https://facebook.com/bromsgrovelitterheroes"],
      location: {
        "@type": "Place",
        name: "Bromsgrove",
        address: { "@type": "PostalAddress", postalCode: "B61 7DR", addressCountry: "GB" },
        geo: { "@type": "GeoCoordinates", latitude: 52.3354, longitude: -2.0612 },
      },
    });
  });

  it("leaves out empty optional fields", () => {
    const node = serialised(
      groupOrganizationJsonLd({
        ...group,
        description: null,
        logo_url: null,
        website_url: null,
        social_url: null,
        contact_email: null,
        location_name: null,
        location_postcode: null,
        latitude: null,
        longitude: null,
      })
    );
    expect(Object.keys(node).sort()).toEqual(["@id", "@type", "name", "url"]);
  });

  it("keeps only the links that are set", () => {
    expect(groupOrganizationJsonLd({ ...group, website_url: null }).sameAs).toEqual([
      "https://facebook.com/bromsgrovelitterheroes",
    ]);
  });
});

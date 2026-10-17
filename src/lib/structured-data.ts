import type { EventWithCount, GroupRow } from "@/lib/events";
import {
  absoluteUrl,
  CONTACT_EMAIL,
  DEFAULT_DESCRIPTION,
  districtName,
  SITE_LOGO,
  SITE_NAME,
  SOCIAL_PROFILES,
} from "@/lib/seo";

/** A schema.org node. `undefined` properties are dropped when serialised. */
export type JsonLdNode = { "@type": string } & Record<string, unknown>;

export interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
}

const SCHEMA = "https://schema.org";

export const SITE_ORGANIZATION_ID = absoluteUrl("/#organization");
export const WEBSITE_ID = absoluteUrl("/#website");

/** One `<script>` per page: Google reads every node in an `@graph`, and `@id`s link them. */
export function jsonLdGraph(nodes: (JsonLdNode | null | undefined)[]): JsonLdGraph | null {
  const graph = nodes.filter((node): node is JsonLdNode => node != null);
  return graph.length ? { "@context": SCHEMA, "@graph": graph } : null;
}

export function eventPath(id: string): string {
  return `/events/${encodeURIComponent(id)}`;
}

export function groupPath(slug: string): string {
  return `/groups/${encodeURIComponent(slug)}`;
}

function groupOrganizationId(slug: string): string {
  return absoluteUrl(`${groupPath(slug)}#organization`);
}

/** LitterLink itself — homepage only, as Google recommends. */
export function siteOrganizationJsonLd(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": SITE_ORGANIZATION_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(SITE_LOGO.url),
      width: SITE_LOGO.width,
      height: SITE_LOGO.height,
    },
    description: DEFAULT_DESCRIPTION,
    email: CONTACT_EMAIL,
    sameAs: Object.values(SOCIAL_PROFILES),
  };
}

// No SearchAction: Google retired the sitelinks search box in November 2024.
export function websiteJsonLd(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en-GB",
    publisher: { "@id": SITE_ORGANIZATION_ID },
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path. */
  path: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type EventJsonLdFields = Pick<
  EventWithCount,
  | "id"
  | "title"
  | "description"
  | "status"
  | "starts_at"
  | "ends_at"
  | "created_at"
  | "latitude"
  | "longitude"
  | "address_label"
  | "location_postcode"
  | "location_admin_district"
  | "max_attendees"
  | "confirmed_count"
  | "organiser_name"
  | "group_name"
  | "group_slug"
>;

function eventOrganizer(event: EventJsonLdFields): JsonLdNode | undefined {
  if (event.group_name && event.group_slug) {
    return {
      "@type": "Organization",
      "@id": groupOrganizationId(event.group_slug),
      name: event.group_name,
      url: absoluteUrl(groupPath(event.group_slug)),
    };
  }
  // Profile pages are nofollow and not indexed, so the organiser is named without a URL.
  if (event.organiser_name) return { "@type": "Person", name: event.organiser_name };
  return undefined;
}

/**
 * Google `Event` structured data. Returns null for drafts, which aren't public. Every LitterLink event is free and
 * in person; capacity and the free `Offer` are only given while the event is still upcoming and bookable.
 */
export function eventJsonLd(event: EventJsonLdFields, now = new Date()): JsonLdNode | null {
  if (event.status === "draft") return null;

  const url = absoluteUrl(eventPath(event.id));
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const locality = districtName(event.location_admin_district);
  const placeName = event.address_label ?? event.location_postcode;
  const isUpcoming = event.status === "published" && start > now;
  const remaining =
    event.max_attendees != null ? Math.max(0, event.max_attendees - event.confirmed_count) : null;

  return {
    "@type": "Event",
    "@id": `${url}#event`,
    name: event.title,
    description:
      event.description ?? `A community litter pick at ${placeName}${locality ? `, ${locality}` : ""}.`,
    url,
    image: [absoluteUrl(`${eventPath(event.id)}/opengraph-image`)],
    startDate: start.toISOString(),
    endDate: end && end > start ? end.toISOString() : undefined,
    eventStatus: `${SCHEMA}/${event.status === "cancelled" ? "EventCancelled" : "EventScheduled"}`,
    eventAttendanceMode: `${SCHEMA}/OfflineEventAttendanceMode`,
    location: {
      "@type": "Place",
      name: placeName,
      address: {
        "@type": "PostalAddress",
        postalCode: event.location_postcode,
        addressLocality: locality ?? undefined,
        addressCountry: "GB",
      },
      geo: { "@type": "GeoCoordinates", latitude: event.latitude, longitude: event.longitude },
    },
    organizer: eventOrganizer(event),
    isAccessibleForFree: true,
    maximumAttendeeCapacity: event.max_attendees ?? undefined,
    remainingAttendeeCapacity: isUpcoming && remaining != null ? remaining : undefined,
    offers: isUpcoming
      ? {
          "@type": "Offer",
          price: 0,
          priceCurrency: "GBP",
          availability: `${SCHEMA}/${remaining === 0 ? "SoldOut" : "InStock"}`,
          url,
          validFrom: new Date(event.created_at).toISOString(),
        }
      : undefined,
  };
}

export type GroupJsonLdFields = Pick<
  GroupRow,
  | "name"
  | "slug"
  | "description"
  | "logo_url"
  | "website_url"
  | "social_url"
  | "contact_email"
  | "location_name"
  | "location_postcode"
  | "latitude"
  | "longitude"
>;

/** `Organization` for a group page; event pages reference it by `@id` as the organiser. */
export function groupOrganizationJsonLd(group: GroupJsonLdFields): JsonLdNode {
  const sameAs = [group.website_url, group.social_url].filter((link): link is string => Boolean(link));
  const hasGeo = group.latitude != null && group.longitude != null;
  const hasLocation = Boolean(group.location_name || group.location_postcode || hasGeo);

  return {
    "@type": "Organization",
    "@id": groupOrganizationId(group.slug),
    name: group.name,
    url: absoluteUrl(groupPath(group.slug)),
    description: group.description ?? undefined,
    logo: group.logo_url ?? undefined,
    email: group.contact_email ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    location: hasLocation
      ? {
          "@type": "Place",
          name: group.location_name || undefined,
          address: group.location_postcode
            ? { "@type": "PostalAddress", postalCode: group.location_postcode, addressCountry: "GB" }
            : undefined,
          geo: hasGeo
            ? { "@type": "GeoCoordinates", latitude: group.latitude, longitude: group.longitude }
            : undefined,
        }
      : undefined,
  };
}

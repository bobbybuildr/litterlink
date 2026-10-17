import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk").replace(/\/+$/, "");
export const SITE_NAME = "LitterLink";
export const DEFAULT_DESCRIPTION =
  "Find and join local litter-picking events near you. Track your impact and help keep communities clean.";

/** Served by the `src/app/opengraph-image.png` file convention. */
export const DEFAULT_SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "LitterLink — find local litter picks near you. Join community cleanups across the UK.",
} as const;

const OPEN_GRAPH_BASE = {
  siteName: SITE_NAME,
  type: "website",
  locale: "en_GB",
} as const;

// Pages that set `openGraph` replace the whole object, so the share image lives here rather than relying on
// the root file convention. X falls back to `openGraph.images` when `twitter.images` isn't set.
export const OPEN_GRAPH_DEFAULTS = {
  ...OPEN_GRAPH_BASE,
  images: DEFAULT_SHARE_IMAGE,
} as const;

export const CONTACT_EMAIL = "hello@litterlink.co.uk";

/** LitterLink's own social profiles: linked from the footer and listed as `sameAs` in the site's JSON-LD. */
export const SOCIAL_PROFILES = {
  facebook: "https://www.facebook.com/LitterLinkOfficial",
  instagram: "https://instagram.com/litterlink_",
  x: "https://x.com/litterlink_",
} as const;

/** Square brand mark for the `Organization` logo; Google wants at least 112×112 and recommends square. */
export const SITE_LOGO = { url: "/android-chrome-512x512.png", width: 512, height: 512 } as const;

export const TWITTER_DEFAULTS = {
  card: "summary_large_image",
  site: "@litterlink_",
} as const;

/** Private/account pages: keep out of the index and don't pass link signals. */
export const NOINDEX = { index: false, follow: false } as const;
/** Crawlable utility pages (auth, filtered listings): keep out of the index but follow links. */
export const NOINDEX_FOLLOW = { index: false, follow: true } as const;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Collapses whitespace and truncates on a word boundary for `<meta name="description">`. */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:–-]+$/, "")}…`;
}

/** postcodes.io returns some districts in the inverted ONS form, e.g. "Bristol, City of" → "Bristol". */
export function districtName(adminDistrict: string | null | undefined): string | null {
  const name = adminDistrict?.replace(/,\s*(City|County) of$/i, "").trim();
  return name || null;
}

type SearchParamValue = string | string[] | undefined;

/** True when any of `keys` carries a non-empty value — i.e. a filtered/paginated listing variant. */
export function hasListingParams(
  params: Record<string, SearchParamValue>,
  keys: readonly string[]
): boolean {
  return keys.some((key) => {
    const value = params[key];
    return Array.isArray(value) ? value.some(Boolean) : Boolean(value);
  });
}

interface PageMetadataOptions {
  title: string;
  description: string;
  /** Site-relative path, resolved against `metadataBase`. */
  path: string;
  /** Skip the root `%s | LitterLink` title template. */
  absoluteTitle?: boolean;
  /** Filtered/paginated variants: noindex,follow and no canonical (Google advises against mixing the two). */
  indexable?: boolean;
  /**
   * Set false on routes with their own `opengraph-image.*` file: Next only applies a file-based image when the
   * route's metadata leaves `openGraph.images` unset.
   */
  defaultImage?: boolean;
}

/** Title, description, canonical and Open Graph for an indexable public page. */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  indexable = true,
  defaultImage = true,
}: PageMetadataOptions): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(indexable
      ? { alternates: { canonical: path } }
      : { robots: NOINDEX_FOLLOW }),
    openGraph: { ...(defaultImage ? OPEN_GRAPH_DEFAULTS : OPEN_GRAPH_BASE), title, description, url: path },
  };
}

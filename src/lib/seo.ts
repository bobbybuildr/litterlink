import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk").replace(/\/+$/, "");
export const SITE_NAME = "LitterLink";
export const DEFAULT_DESCRIPTION =
  "Find and join local litter-picking events near you. Track your impact and help keep communities clean.";

export const OPEN_GRAPH_DEFAULTS = {
  siteName: SITE_NAME,
  type: "website",
  locale: "en_GB",
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
}

/** Title, description, canonical and Open Graph for an indexable public page. */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  indexable = true,
}: PageMetadataOptions): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(indexable
      ? { alternates: { canonical: path } }
      : { robots: NOINDEX_FOLLOW }),
    openGraph: { ...OPEN_GRAPH_DEFAULTS, title, description, url: path },
  };
}

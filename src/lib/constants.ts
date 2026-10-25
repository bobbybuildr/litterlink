/**
 * Shared constants with no server-only dependencies, safe to import from
 * both Server and Client Components.
 */

/** Shape check only — whether a postcode exists is decided by postcodes.io. */
export const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Values are kilometres; labels are the miles shown in the filters. */
export const RADIUS_OPTIONS = [
  { label: "5 mi", value: "8" },
  { label: "10 mi", value: "16" },
  { label: "25 mi", value: "40" },
  { label: "50 mi", value: "80" },
] as const;

export const DEFAULT_RADIUS_KM = 16;

/** Master switch for the site-wide banner (`BetaBanner`). Hidden by default; set to `true` to show it again. */
export const SHOW_BETA_BANNER = false;

/** Session cookie set when a visitor dismisses the site banner, so the server can omit it. */
export const BETA_BANNER_DISMISSED_COOKIE = "beta-banner-dismissed";

export const GROUP_TYPE_LABELS: Record<string, string> = {
  community: "Community group",
  school: "School",
  corporate: "Corporate",
  council: "Council",
  charity: "Charity",
  other: "Organisation",
};

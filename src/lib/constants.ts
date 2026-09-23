/**
 * Shared constants with no server-only dependencies, safe to import from
 * both Server and Client Components.
 */

/** Shape check only — whether a postcode exists is decided by postcodes.io. */
export const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export const GROUP_TYPE_LABELS: Record<string, string> = {
  community: "Community group",
  school: "School",
  corporate: "Corporate",
  council: "Council",
  charity: "Charity",
  other: "Organisation",
};

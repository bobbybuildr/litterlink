/** "Last updated" dates (ISO `YYYY-MM-DD`) shown on the legal pages and reported as their sitemap `lastModified`. */
export const TERMS_LAST_UPDATED = "2026-04-03";
export const PRIVACY_LAST_UPDATED = "2026-09-24";

/** "3 April 2026" */
export function formatLegalDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

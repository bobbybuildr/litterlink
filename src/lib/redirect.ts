const DEFAULT_REDIRECT = "/dashboard";
const PROBE_ORIGIN = "http://localhost";

/**
 * Returns `raw` as a same-origin path ("/path?query#hash") for use as a
 * post-auth redirect, or `fallback` if it could leave the site.
 */
export function safeRedirectPath(
  raw: unknown,
  fallback: string = DEFAULT_REDIRECT
): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return fallback;

  // Parse as a browser would, so "/\evil.com" and "/\t/evil.com" (both read as "//evil.com") are caught.
  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;

  return url.pathname + url.search + url.hash;
}

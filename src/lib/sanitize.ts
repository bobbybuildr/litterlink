/**
 * Strip HTML tags from user-supplied text to prevent stored XSS.
 * React auto-escapes values in JSX, but this adds defence-in-depth
 * for any future raw rendering paths.
 */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

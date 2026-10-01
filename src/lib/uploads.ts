// Server-side backstop: clients normalise every upload to WebP via `@/lib/image`.
export const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// Clients compress to ~1 MB (photos) or 0.25 MB (logos/avatars); must stay under `bodySizeLimit`.
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

/** Returns a user-facing error message, or `null` if the file is acceptable. */
export function validateImageUpload(file: File, label = "Image"): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${label} must be a JPEG, PNG, or WebP image.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${label} must be under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}

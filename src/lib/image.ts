/**
 * Client-side image normalisation shared by the avatar, group logo and event
 * photo uploads. Everything is converted to WebP before it leaves the browser,
 * so Supabase only ever receives `image/webp`.
 */

export const IMAGE_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

// Ceiling on the source file, before compression — guards against decoding huge images.
export const MAX_IMAGE_SOURCE_BYTES = 25 * 1024 * 1024;

const ALLOWED_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** HEIC files often arrive with an empty MIME type, so the extension is the reliable signal. */
export function looksHeic(file: File): boolean {
  return /\.hei[cf]$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
}

export function isSupportedImage(file: File): boolean {
  return looksHeic(file) || ALLOWED_SOURCE_TYPES.has(file.type);
}

/** Decodes HEIC to JPEG. A file that isn't actually HEIC is returned untouched. */
export async function decodeHeic(file: File): Promise<File> {
  if (!looksHeic(file)) return file;
  const { heicTo, isHeic } = await import("heic-to");
  if (!(await isHeic(file))) return file;
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}

/** Decodes HEIC if needed, then compresses to WebP under the given constraints. */
export async function toCompressedWebp(
  file: File,
  options: { maxSizeMB: number; maxWidthOrHeight: number },
  name = "image.webp"
): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression");
  const decoded = await decodeHeic(file);
  const compressed = await imageCompression(decoded, {
    ...options,
    useWebWorker: true,
    fileType: "image/webp",
  });
  return new File([compressed], name, { type: "image/webp" });
}

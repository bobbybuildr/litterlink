"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IMAGE_UPLOAD_ACCEPT,
  MAX_IMAGE_SOURCE_BYTES,
  decodeHeic,
  isSupportedImage,
  looksHeic,
} from "@/lib/image";
import { uploadEventPhoto } from "@/app/events/actions";

const MAX_PHOTOS = 10;

const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/webp",
};

interface SelectedPhoto {
  key: string;
  name: string;
  file: File;
  previewUrl: string | null;
  converting: boolean;
  failed?: string;
}

interface PhotoUploadProps {
  eventId: string;
  existingCount?: number;
  className?: string;
}

export function PhotoUpload({ eventId, existingCount = 0, className }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prepared, setPrepared] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const remainingSlots = Math.max(0, MAX_PHOTOS - existingCount);
  const converting = photos.some((p) => p.converting);
  const uploadable = photos.filter((p) => !p.converting && !p.failed);

  // Revoke preview URLs centrally as they drop out of the list, and on unmount.
  const liveUrls = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(photos.flatMap((p) => (p.previewUrl ? [p.previewUrl] : [])));
    for (const url of liveUrls.current) {
      if (!current.has(url)) URL.revokeObjectURL(url);
    }
    liveUrls.current = current;
  }, [photos]);
  useEffect(() => {
    const urls = liveUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  async function convertHeic(key: string, file: File) {
    try {
      const source = await decodeHeic(file);
      const previewUrl = URL.createObjectURL(source);
      setPhotos((current) =>
        current.map((p) =>
          p.key === key ? { ...p, file: source, previewUrl, converting: false } : p
        )
      );
    } catch {
      setPhotos((current) =>
        current.map((p) =>
          p.key === key
            ? {
                ...p,
                converting: false,
                failed: `${p.name}: could not be read — try sharing it as a JPEG instead.`,
              }
            : p
        )
      );
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    // Clearing the input lets a removed file be picked again.
    e.target.value = "";
    if (!picked.length) return;

    const seen = new Set(photos.map((p) => p.key));
    const next = [...photos];
    const skipped: string[] = [];
    const queued: SelectedPhoto[] = [];

    for (const file of picked) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) continue;
      const heic = looksHeic(file);
      if (!isSupportedImage(file)) {
        skipped.push(`${file.name}: must be a JPEG, PNG, WebP or HEIC image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_SOURCE_BYTES) {
        skipped.push(`${file.name}: is too large (25 MB maximum).`);
        continue;
      }
      if (next.length >= remainingSlots) {
        skipped.push(
          remainingSlots === 0
            ? `This event already has the maximum of ${MAX_PHOTOS} photos.`
            : `Only ${remainingSlots} photo${remainingSlots === 1 ? "" : "s"} can be added to this event.`
        );
        break;
      }
      seen.add(key);
      const entry: SelectedPhoto = {
        key,
        name: file.name,
        file,
        previewUrl: heic ? null : URL.createObjectURL(file),
        converting: heic,
      };
      next.push(entry);
      if (heic) queued.push(entry);
    }

    setSuccess(null);
    setError(skipped.length ? [...new Set(skipped)].join(" ") : null);
    setPhotos(next);
    queued.forEach((p) => void convertHeic(p.key, p.file));
  }

  function removePhoto(key: string) {
    setPhotos((current) => current.filter((p) => p.key !== key));
    setError(null);
  }

  function clearPhotos() {
    setPhotos([]);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!uploadable.length || converting) return;
    if (uploadable.length > remainingSlots) {
      setError(`Only ${remainingSlots} photo${remainingSlots === 1 ? "" : "s"} can be added to this event.`);
      return;
    }

    startTransition(async () => {
      try {
        const { default: imageCompression } = await import("browser-image-compression");
        const formData = new FormData();
        const problems: string[] = [];
        let count = 0;

        for (const { key, file, name } of uploadable) {
          try {
            const compressed = await imageCompression(file, compressionOptions);
            formData.append("photos", compressed, file.name);
            formData.append("keys", key);
            count++;
          } catch {
            problems.push(`${name}: could not be processed — try re-saving it as a JPEG.`);
          }
          setPrepared((n) => n + 1);
        }

        if (!count) {
          setError(problems.join(" ") || "None of the selected photos could be processed.");
          return;
        }

        const result = await uploadEventPhoto(eventId, formData);
        const uploadedKeys = new Set(result.uploaded);

        if (uploadedKeys.size) {
          setPhotos((current) => current.filter((p) => !uploadedKeys.has(p.key)));
          router.refresh();
        }

        problems.push(...result.failed.map((f) => f.message));
        if (!uploadedKeys.size && !result.failed.length && result.error) {
          problems.push(result.error);
        }

        if (problems.length) setError(problems.join(" "));
        if (uploadedKeys.size) {
          setSuccess(
            `${uploadedKeys.size} photo${uploadedKeys.size === 1 ? "" : "s"} uploaded successfully.`
          );
        }
      } catch {
        setError("Something went wrong while uploading. Please try again.");
      } finally {
        setPrepared(0);
      }
    });
  }

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-5", className)}>
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
        <Camera className="h-4 w-4" />
        Upload photos
      </h2>
      <form onSubmit={handleSubmit}>
        <input
          name="photos"
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          multiple
          disabled={isPending || photos.length >= remainingSlots}
          onChange={handleFileChange}
          className="block w-full text-sm hover:cursor-pointer text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {remainingSlots === 0
            ? `This event already has the maximum of ${MAX_PHOTOS} photos.`
            : `JPEG, PNG, WebP or iPhone HEIC. Add up to ${remainingSlots} more.`}
        </p>

        {photos.length > 0 && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">
                {photos.length} of {remainingSlots} selected
              </p>
              <button
                type="button"
                onClick={clearPhotos}
                disabled={isPending}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
              >
                Clear all
              </button>
            </div>
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((photo) => (
                <li key={photo.key} className="group relative aspect-square">
                  {photo.previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- next/image cannot load blob: preview URLs */
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      className="h-full w-full rounded-lg border border-gray-200 object-cover"
                    />
                  ) : (
                    <div
                      title={photo.failed ?? photo.name}
                      className={cn(
                        "flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border px-1 text-center",
                        photo.failed
                          ? "border-red-200 bg-red-50 text-red-600"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      )}
                    >
                      {photo.converting ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                      ) : (
                        <ImageOff className="h-4 w-4" />
                      )}
                      <span className="w-full truncate text-[10px]">
                        {photo.converting ? "Converting…" : "Unreadable"}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.key)}
                    disabled={isPending}
                    aria-label={`Remove ${photo.name}`}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900/80 p-1 text-white transition-opacity hover:bg-gray-900 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div role="alert" aria-live="assertive">
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div role="status" aria-live="polite">
          {success && <p className="mt-2 text-sm text-emerald-700">{success}</p>}
        </div>
        <button
          type="submit"
          disabled={
            uploadable.length === 0 ||
            converting ||
            isPending ||
            uploadable.length > remainingSlots
          }
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending
            ? prepared < uploadable.length
              ? `Preparing ${prepared + 1} of ${uploadable.length}…`
              : "Uploading…"
            : converting
              ? "Converting photos…"
              : uploadable.length > 0
                ? `Upload ${uploadable.length} ${uploadable.length === 1 ? "photo" : "photos"}`
                : "Upload"}
        </button>
      </form>
    </div>
  );
}

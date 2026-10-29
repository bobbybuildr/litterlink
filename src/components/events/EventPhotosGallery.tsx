"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteEventPhoto } from "@/app/events/actions";
import { PhotoLightbox } from "@/components/events/PhotoLightbox";

interface Photo {
  id: string;
  url: string;
}

interface EventPhotosGalleryProps {
  photos: Photo[];
  eventTitle: string;
  isOrganiser?: boolean;
  className?: string;
}

function photoAlt(eventTitle: string, n: number): string {
  const subject = /litter/i.test(eventTitle) ? eventTitle : `${eventTitle} litter pick`;
  return `${subject} – photo ${n}`;
}

export function EventPhotosGallery({ photos: initialPhotos, eventTitle, isOrganiser, className }: EventPhotosGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  if (!photos.length) return null;

  async function handleDelete(photoId: string) {
    setDeletingIds((prev) => new Set(prev).add(photoId));
    setDeleteError(null);
    const result = await deleteEventPhoto(photoId);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="font-semibold text-gray-900">Event photos</h2>
      <div role="alert" aria-live="assertive">
        {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <div key={photo.id} className="relative group overflow-hidden rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-haspopup="dialog"
              className="relative block h-40 w-full cursor-zoom-in hover:opacity-90 transition-opacity"
            >
              <Image
                src={photo.url}
                alt={photoAlt(eventTitle, i + 1)}
                fill
                sizes="(min-width: 1024px) 190px, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </button>
            {isOrganiser && (
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingIds.has(photo.id)}
                aria-label="Delete photo"
                className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-md bg-black/60 p-1.5 text-white transition-opacity hover:bg-red-600 disabled:cursor-not-allowed sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                {deletingIds.has(photo.id) ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
      {openIndex !== null && openIndex < photos.length && (
        <PhotoLightbox
          photos={photos.map((photo, i) => ({ ...photo, alt: photoAlt(eventTitle, i + 1) }))}
          initialIndex={openIndex}
          label={`${eventTitle} photos`}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}

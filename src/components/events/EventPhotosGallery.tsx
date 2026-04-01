"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteEventPhoto } from "@/app/events/actions";

interface Photo {
  id: string;
  url: string;
}

interface EventPhotosGalleryProps {
  photos: Photo[];
  isOrganiser?: boolean;
  className?: string;
}

export function EventPhotosGallery({ photos: initialPhotos, isOrganiser, className }: EventPhotosGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      {deleteError && (
        <p className="text-sm text-red-600">{deleteError}</p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group overflow-hidden rounded-lg border border-gray-200">
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Event photo"
                className="h-40 w-full object-cover"
                loading="lazy"
              />
            </a>
            {isOrganiser && (
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deletingIds.has(photo.id)}
                aria-label="Delete photo"
                className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-md bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:cursor-not-allowed"
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
    </div>
  );
}

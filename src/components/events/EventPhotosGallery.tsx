import { cn } from "@/lib/utils";

interface EventPhotosGalleryProps {
  photoUrls: string[];
  className?: string;
}

export function EventPhotosGallery({ photoUrls, className }: EventPhotosGalleryProps) {
  if (!photoUrls.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="font-semibold text-gray-900">Event photos</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photoUrls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Event photo ${i + 1}`}
              className="h-40 w-full object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

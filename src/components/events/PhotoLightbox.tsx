"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxPhoto {
  id: string;
  url: string;
  alt: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  label: string;
  onClose: () => void;
  className?: string;
}

/**
 * Full-screen photo slider in a native modal `<dialog>` (focus trap, Escape and
 * inert background come from the browser). The track is a CSS scroll-snap
 * container, so touch swiping is native; buttons and arrow keys scroll it too.
 * Mount it only while open â€” it opens itself on mount and calls `onClose` when
 * dismissed.
 */
export function PhotoLightbox({ photos, initialIndex, label, onClose, className }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const lastIndex = photos.length - 1;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const track = trackRef.current;
    if (!dialog || !track) return;
    if (!dialog.open) dialog.showModal();
    track.scrollLeft = initialIndex * track.clientWidth;
  }, [initialIndex]);

  // showModal() doesn't stop the page behind from scrolling
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const target = Math.min(Math.max(index, 0), lastIndex);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: target * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [lastIndex],
  );

  const step = useCallback(
    (delta: number) => {
      const track = trackRef.current;
      if (!track || !track.clientWidth) return;
      goTo(Math.round(track.scrollLeft / track.clientWidth) + delta);
    },
    [goTo],
  );

  // On the document so the arrow keys work wherever focus sits inside the dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(lastIndex);
      else return;
      e.preventDefault();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [step, goTo, lastIndex]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  const navButtonClass =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-black/60 sm:p-3";

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      className={cn(
        "m-0 h-dvh max-h-none w-dvw max-w-none flex-col border-0 bg-black p-0 text-white open:flex",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <p aria-live="polite" className="text-sm font-medium tabular-nums">
          Photo {activeIndex + 1} of {photos.length}
        </p>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close photo viewer"
          className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          role="region"
          aria-roledescription="carousel"
          aria-label={label}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${photos.length}`}
              aria-hidden={i !== activeIndex}
              className="h-full w-full shrink-0 snap-center snap-always p-3 sm:px-20 sm:py-4"
            >
              <div className="relative h-full w-full">
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority={i === initialIndex}
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-disabled={activeIndex === 0}
              aria-label="Previous photo"
              className={cn(navButtonClass, "left-2 sm:left-4")}
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-disabled={activeIndex === lastIndex}
              aria-label="Next photo"
              className={cn(navButtonClass, "right-2 sm:right-4")}
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

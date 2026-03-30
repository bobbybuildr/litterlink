"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadEventPhoto } from "@/app/events/actions";

interface PhotoUploadProps {
  eventId: string;
  className?: string;
}

export function PhotoUpload({ eventId, className }: PhotoUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadEventPhoto(eventId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-5", className)}>
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
        <Camera className="h-4 w-4" />
        Upload photos
      </h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        <input
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        <p className="mt-1.5 text-xs text-gray-400">JPEG, PNG or WebP · max 5 MB per file</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && (
          <p className="mt-2 text-sm text-emerald-700">Photos uploaded successfully.</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}

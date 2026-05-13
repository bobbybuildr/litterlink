"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { Camera, X, Users } from "lucide-react";

const compressionOptions = {
  maxSizeMB: 0.25,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

interface LogoUploadInputProps {
  initialLogoUrl?: string | null;
}

export function LogoUploadInput({ initialLogoUrl }: LogoUploadInputProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const isCompressingRef = useRef(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    isCompressingRef.current = isCompressing;
  }, [isCompressing]);

  // Block form submission while compression is in progress
  useEffect(() => {
    const form = inputRef.current?.closest("form");
    if (!form) return;

    function handleSubmit(e: Event) {
      if (isCompressingRef.current) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !inputRef.current) return;

    setRemoved(false);
    setPreview(URL.createObjectURL(file));
    setIsCompressing(true);
    try {
      const compressed = await imageCompression(file, compressionOptions);
      const dt = new DataTransfer();
      dt.items.add(new File([compressed], "logo.webp", { type: "image/webp" }));
      inputRef.current.files = dt.files;
    } finally {
      setIsCompressing(false);
    }
  }

  function handleRemove() {
    setRemoved(true);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const shownLogo = removed ? null : (preview ?? initialLogoUrl ?? null);

  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 mb-2">
        Group logo{" "}
        <span className="font-normal text-gray-400">(Optional)</span>
      </p>

      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-2 ring-brand/20 transition-all hover:ring-brand/50 focus-visible:outline-none focus-visible:ring-brand"
          aria-label="Upload group logo"
        >
          {shownLogo ? (
            <Image
              src={shownLogo}
              alt="Group logo"
              fill
              sizes="80px"
              className="object-cover"
              unoptimized={shownLogo.startsWith("blob:")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand/10">
              <Users className="h-8 w-8 text-brand/60" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </button>

        <div className="flex flex-col justify-center gap-1.5 pt-1">
          <p className="text-xs text-gray-400">
            {isCompressing ? "Compressing…" : "JPEG, PNG or WebP"}
          </p>
          {shownLogo && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex w-fit items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <X className="h-3 w-3" />
              Remove logo
            </button>
          )}
        </div>
      </div>

      {/* Signal logo removal to the server action (only needed when editing) */}
      {initialLogoUrl !== undefined && (
        <input type="hidden" name="remove_logo" value={removed ? "1" : "0"} />
      )}

      <input
        ref={inputRef}
        id="logo"
        name="logo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={isCompressing}
        onChange={handleChange}
        className="sr-only"
      />
    </div>
  );
}

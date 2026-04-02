"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";

const compressionOptions = {
  maxSizeMB: 0.25,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: "image/webp",
};

export function LogoUploadInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const isCompressingRef = useRef(false);

  // Keep the ref in sync so the event listener closure always sees the latest value
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

  return (
    <div>
      <input
        ref={inputRef}
        id="logo"
        name="logo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={isCompressing}
        onChange={handleChange}
        className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200 disabled:opacity-60"
      />
      {isCompressing && (
        <p className="mt-1 text-xs text-gray-400">Compressing…</p>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera } from "lucide-react";
import { updateProfile, type ProfileState } from "./actions";

const compressionOptions = {
  maxSizeMB: 0.25,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: "image/webp",
};

interface Props {
  displayName: string | null;
  postcode: string | null;
  avatarUrl: string | null;
  email: string;
}

export function ProfileForm({ displayName, postcode, avatarUrl, email }: Props) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    null,
  );

  // Local preview of a newly-selected file before saving
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear preview once the server confirms the save so the fresh DB URL shows
  useEffect(() => {
    if (state?.success) setPreview(null);
  }, [state?.success]);

  const shownAvatar = preview ?? avatarUrl;
  const initials = (displayName ?? email).charAt(0).toUpperCase();

  return (
    <form action={action}>
      {/* ── Avatar ── */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-brand/20 transition-all hover:ring-brand/50 focus-visible:outline-none focus-visible:ring-brand"
          aria-label="Change profile photo"
        >
          {shownAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownAvatar}
              alt="Profile photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand text-2xl font-bold text-white">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>

        <p className="text-xs text-gray-400">
          {isCompressing ? "Compressing…" : "JPEG, PNG or WebP · max 5 MB"}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setPreview(URL.createObjectURL(file));
            setIsCompressing(true);
            try {
              const compressed = await imageCompression(file, compressionOptions);
              const dt = new DataTransfer();
              dt.items.add(new File([compressed], "avatar.webp", { type: "image/webp" }));
              if (fileInputRef.current) fileInputRef.current.files = dt.files;
            } finally {
              setIsCompressing(false);
            }
          }}
        />
      </div>

      {/* ── Fields ── */}
      <div className="space-y-5">
        <div>
          <label
            htmlFor="display_name"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={displayName ?? ""}
            placeholder="Your name"
            maxLength={60}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label
            htmlFor="postcode"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Home postcode
          </label>
          <input
            id="postcode"
            name="postcode"
            type="text"
            defaultValue={postcode ?? ""}
            placeholder="e.g. SW1A 1AA"
            maxLength={10}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm uppercase outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Used to suggest events near you.
          </p>
        </div>
      </div>

      {/* ── Feedback ── */}
      {state?.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Profile saved successfully!
        </p>
      )}

      <button
        type="submit"
        disabled={pending || isCompressing}
        className="mt-6 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {isCompressing ? "Compressing…" : pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

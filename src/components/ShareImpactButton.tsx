"use client";

import { useState } from "react";

const SHARE_URL =
  typeof window !== "undefined"
    ? window.location.origin + "/impact"
    : "https://litterlink.co.uk/impact";

export function ShareImpactButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: "LitterLink Impact",
      text: "See the difference volunteers are making across the UK 🌿",
      url: SHARE_URL,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(SHARE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
    >
      {copied ? "Link copied!" : "Share our impact"}
    </button>
  );
}

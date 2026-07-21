"use client";

import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareGroupButtonProps {
  title: string;
  className?: string;
}

export function ShareGroupButton({ title, className }: ShareGroupButtonProps) {
  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Invite others to join"
      title="Invite others to join"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors",
        className
      )}
    >
      <Share2 className="h-3.5 w-3.5" />
    </button>
  );
}

"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { BETA_BANNER_DISMISSED_COOKIE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BetaBannerProps {
  /** Read from the cookie on the server so the first HTML already matches (no hydration mismatch or layout shift). */
  initiallyDismissed?: boolean;
  className?: string;
}

export function BetaBanner({ initiallyDismissed = false, className }: BetaBannerProps) {
  const [dismissed, setDismissed] = useState(initiallyDismissed);

  function dismiss() {
    document.cookie = `${BETA_BANNER_DISMISSED_COOKIE}=1; path=/; SameSite=Lax`;
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-50 flex items-center justify-center gap-x-3 bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-900",
        className
      )}
    >
      <span className="flex-1 flex flex-col sm:flex-row min-w-0 items-center justify-center gap-x-2">
        <span>
          <span aria-hidden="true">🚧</span>
          LitterLink is currently in beta<span className="hidden sm:inline"> — we&apos;re building this with the community.&nbsp;</span>
        </span>
        <a
          href="https://forms.gle/qBKyW1zy6vuXr3bD7"
          target="_blank"
          rel="noopener noreferrer"
          className="block sm:inline-block shrink-0 font-medium underline underline-offset-2 hover:text-green-700 transition-colors"
        >
          Share your feedback →
        </a>
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="ml-auto shrink-0 rounded p-0.5 hover:bg-green-100 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "beta-banner-dismissed";

export function BetaBanner({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-50 flex items-center justify-center gap-x-3 bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-900",
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-x-2">
        <span aria-hidden="true">🚧</span>
        <span className="truncate">
          LitterLink is in beta — we&apos;re building this with the community.
        </span>
        <a
          href="https://forms.gle/qBKyW1zy6vuXr3bD7"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-medium underline underline-offset-2 hover:text-green-700 transition-colors"
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

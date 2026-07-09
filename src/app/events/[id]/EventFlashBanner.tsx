"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";

type FlashKey = "updated" | "statsSaved" | "statsUpdated";

const FLASH_MESSAGES: Record<FlashKey, string> = {
  updated: "Event updated successfully.",
  statsSaved: "Impact stats saved and published successfully.",
  statsUpdated: "Impact stats updated successfully.",
};

const FLASH_KEYS = Object.keys(FLASH_MESSAGES) as FlashKey[];

export function EventFlashBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Capture the flash key on first render only — this state won't be
  // affected when router.replace() below causes searchParams to update,
  // so the banner stays visible after the query string is cleared.
  const [flashKey] = useState<FlashKey | null>(() => {
    for (const key of FLASH_KEYS) {
      if (searchParams.get(key) === "1") return key;
    }
    return null;
  });

  useEffect(() => {
    if (!flashKey) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    let changed = false;

    for (const key of FLASH_KEYS) {
      if (nextParams.has(key)) {
        nextParams.delete(key);
        changed = true;
      }
    }

    if (!changed) return;

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
    // Only run once on mount — flashKey/pathname/router/searchParams are
    // intentionally captured at their initial values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!flashKey) return null;

  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
      <CheckCircle className="h-4 w-4 shrink-0" />
      {FLASH_MESSAGES[flashKey]}
    </div>
  );
}

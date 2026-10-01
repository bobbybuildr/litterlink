"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLASH_MESSAGES, FLASH_PARAM, isFlashKey, type FlashKey } from "@/lib/flash";

interface SuccessBannerProps {
  children: ReactNode;
  className?: string;
}

export function SuccessBanner({ children, className }: SuccessBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800",
        className
      )}
    >
      <CheckCircle className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

interface FlashBannerProps {
  className?: string;
}

/** Shows the success message for a `?flash=<key>` param set via `withFlash()`, then strips it from the URL. */
export function FlashBanner({ className }: FlashBannerProps) {
  return (
    <Suspense fallback={null}>
      <FlashBannerContent className={className} />
    </Suspense>
  );
}

function FlashBannerContent({ className }: FlashBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get(FLASH_PARAM);
  const incoming = isFlashKey(param) ? param : null;

  // Held in state so the message survives the param being stripped below.
  const [flashKey, setFlashKey] = useState<FlashKey | null>(incoming);
  if (incoming && incoming !== flashKey) setFlashKey(incoming);

  useEffect(() => {
    if (param === null) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(FLASH_PARAM);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [param, pathname, router, searchParams]);

  if (!flashKey) return null;

  return <SuccessBanner className={className}>{FLASH_MESSAGES[flashKey]}</SuccessBanner>;
}

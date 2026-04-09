"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";

interface CancelEventButtonProps {
  action: () => Promise<void>;
  className?: string;
}

export function CancelEventButton({ action, className }: CancelEventButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this event? This cannot be undone and all participants will be notified."
    );
    if (!confirmed) return;

    startTransition(async () => {
      await action();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "text-sm font-medium text-red-600 hover:text-red-700 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {isPending ? "Cancelling…" : "Cancel this event"}
    </button>
  );
}

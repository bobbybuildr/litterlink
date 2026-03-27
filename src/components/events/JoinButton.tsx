"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { joinEvent, leaveEvent } from "@/app/events/actions";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinButtonProps {
  eventId: string;
  initialCount: number;
  initialStatus: "confirmed" | "waitlisted" | "cancelled" | null;
  isAuthenticated: boolean;
  isPast: boolean;
}

export function JoinButton({
  eventId,
  initialCount,
  initialStatus,
  isAuthenticated,
  isPast,
}: JoinButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [joined, setJoined] = useState(initialStatus === "confirmed");
  const [count, setCount] = useState(initialCount);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Supabase Realtime — subscribe to participant count changes for this event
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-participants:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
          filter: `event_id=eq.${eventId}`,
        },
        async () => {
          // Re-fetch the confirmed count rather than doing arithmetic
          const { count: fresh } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .eq("status", "confirmed");
          if (fresh != null) setCount(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/sign-in?redirectTo=/events/${eventId}`);
      return;
    }

    setErrorMsg(null);

    // Optimistic UI
    const nextJoined = !joined;
    setJoined(nextJoined);
    setCount((c) => (nextJoined ? c + 1 : Math.max(0, c - 1)));

    startTransition(async () => {
      const result = await (nextJoined ? joinEvent(eventId) : leaveEvent(eventId));
      if (result.error) {
        // Revert on error
        setJoined(!nextJoined);
        setCount((c) => (nextJoined ? Math.max(0, c - 1) : c + 1));
        setErrorMsg(result.error);
      }
    });
  }

  if (isPast) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Users className="h-4 w-4" />
        {count} attended
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleClick}
          disabled={isPending}
          className={cn(
            "rounded-xl px-6 py-3 text-sm font-semibold transition-all",
            joined
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-brand text-white hover:bg-brand-dark shadow-sm",
            isPending && "opacity-60 cursor-not-allowed"
          )}
        >
          {isPending ? "…" : joined ? "✓ Joined — leave" : "Join this litter pick"}
        </button>

        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          {count} joined
        </span>
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      {!isAuthenticated && (
        <p className="text-xs text-gray-500">
          You&apos;ll be asked to sign in first.
        </p>
      )}
    </div>
  );
}

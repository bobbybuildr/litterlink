"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { joinEvent, leaveEvent } from "@/app/events/actions";
import { Users, UserPlus, LogOut, Loader2, CalendarPlus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinButtonProps {
  eventId: string;
  initialCount: number;
  initialStatus: "confirmed" | "waitlisted" | "cancelled" | null;
  isAuthenticated: boolean;
  isPast: boolean;
  isCancelled?: boolean;
  isFull?: boolean;
  eventTitle: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
}

function toIcsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d+/, "").replace(/Z$/, "Z");
}

function buildIcs({
  uid,
  title,
  startsAt,
  endsAt,
  location,
}: {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
}): string {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date().toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LitterLink//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@litterlink`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start.toISOString())}`,
    `DTEND:${toIcsDate(end.toISOString())}`,
    `SUMMARY:${title}`,
    location ? `LOCATION:${location}` : "",
    "DESCRIPTION:Litter pick organised via LitterLink",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function JoinButton({
  eventId,
  initialCount,
  initialStatus,
  isAuthenticated,
  isPast,
  isCancelled = false,
  isFull = false,
  eventTitle,
  startsAt,
  endsAt,
  location,
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

  function handleAddToCalendar() {
    const ics = buildIcs({ uid: eventId, title: eventTitle, startsAt, endsAt, location });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <XCircle className="h-4 w-4 shrink-0" />
        Registrations closed — event cancelled
      </div>
    );
  }

  if (isPast) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Users className="h-4 w-4" />
        {count} joined via LitterLink
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col items-center gap-3">
        {joined && !isPending && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            You have joined this event
          </span>
        )}
        <button
          onClick={handleClick}
          disabled={isPending || (isFull && !joined)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
            isPending
              ? joined
                ? "bg-brand text-white shadow-sm opacity-60 cursor-not-allowed"
                : "border border-red-200 bg-red-50 text-red-700 opacity-60 cursor-not-allowed"
              : joined
              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : isFull
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-brand text-white hover:bg-brand-dark shadow-sm"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {joined ? "Joining…" : "Leaving…"}
            </>
          ) : joined ? (
            <>
              <LogOut className="h-4 w-4" />
              Leave event
            </>
          ) : isFull ? (
            <>
              <Users className="h-4 w-4" />
              Event full
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Join this litter pick
            </>
          )}
        </button>

        {!isAuthenticated && (
          <p className="text-xs text-gray-500">
            You&apos;ll be asked to sign in first.
          </p>
        )}
        
        {joined && !isPending && (
          <button
            onClick={handleAddToCalendar}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand px-6 py-2.5 text-sm font-medium text-brand hover:bg-green-50 transition-colors w-full"
          >
            <CalendarPlus className="h-4 w-4" />
            Add to calendar
          </button>
        )}

        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          {count} joined
        </span>

      </div>

      {errorMsg && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a UTC ISO string to a "YYYY-MM-DDTHH:MM" string expressed in
 * Europe/London local time, suitable for a datetime-local input's value.
 */
export function utcToLondonDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p: Record<string, string> = {};
  parts.forEach(({ type, value }) => {
    p[type] = value;
  });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

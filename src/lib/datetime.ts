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

/**
 * Interprets a naive datetime string ("YYYY-MM-DDTHH:MM") as Europe/London
 * local time and returns a UTC ISO string. Handles BST/GMT automatically.
 */
export function londonToUTC(naive: string): string {
  const asUTC = new Date(naive + "Z");
  const londonAsUTC = new Date(
    utcToLondonDatetimeLocal(asUTC.toISOString()) + "Z"
  );
  const diff = londonAsUTC.getTime() - asUTC.getTime();
  return new Date(asUTC.getTime() - diff).toISOString();
}

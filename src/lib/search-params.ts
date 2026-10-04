import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS } from "@/lib/constants";

export const DEFAULT_EVENT_RANGE_DAYS = 7;
export const MAX_EVENT_RANGE_DAYS = 365;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function parseRadiusKm(raw: string | undefined): number {
  return RADIUS_OPTIONS.some((o) => o.value === raw) ? Number(raw) : DEFAULT_RADIUS_KM;
}

function parseIsoDate(raw: string | undefined): Date | null {
  if (!raw || !ISO_DATE.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  // Rejects dates like 2026-02-31 that Date would otherwise roll into March.
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(raw) ? d : null;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(raw: string | undefined): raw is string {
  return parseIsoDate(raw) !== null;
}

export function addDaysToIsoDate(iso: string, days: number): string {
  return toIsoDate(addDays(new Date(`${iso}T00:00:00Z`), days));
}

/** e.g. "1 January 2027". */
export function formatIsoDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Normalise the `/events` date filter to valid `YYYY-MM-DD` dates spanning at
 * most `MAX_EVENT_RANGE_DAYS`, so a crafted URL can't pull every event.
 * `clamped` is true when the requested span was too long and `to` was moved.
 */
export function parseEventDateRange(
  rawFrom: string | undefined,
  rawTo: string | undefined,
  now = new Date()
): { from: string; to: string; clamped: boolean } {
  let from = parseIsoDate(rawFrom) ?? new Date(`${toIsoDate(now)}T00:00:00Z`);
  let to = parseIsoDate(rawTo) ?? addDays(from, DEFAULT_EVENT_RANGE_DAYS);
  if (to < from) [from, to] = [to, from];
  const max = addDays(from, MAX_EVENT_RANGE_DAYS);
  const clamped = to > max;
  return { from: toIsoDate(from), to: toIsoDate(clamped ? max : to), clamped };
}

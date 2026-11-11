import {
  Bike,
  Building2,
  CalendarDays,
  Earth,
  Fish,
  Flower2,
  Footprints,
  GraduationCap,
  Handshake,
  HeartHandshake,
  House,
  Leaf,
  Park,
  PawPrint,
  Recycle,
  School,
  Shell,
  Ship,
  Sprout,
  Trash2,
  TreePine,
  Trees,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

/**
 * Event icons: the allowlist organisers choose from.
 *
 * The database stores only the stable `key` (`events.icon_key`), never a
 * component name or markup. Lookups go through `getEventIcon()` and
 * `parseEventIconKey()`, so an unknown or missing key can never resolve to
 * anything outside this list.
 * Keys are persisted: never rename or reuse one — add a new entry instead.
 */

/** Tailwind classes sit here as full strings so Tailwind's source scan picks them up. */
export const EVENT_ICON_CATEGORIES = {
  nature: { label: "Parks and nature", tileClassName: "bg-emerald-50 text-emerald-600" },
  coastal: { label: "Coastal and waterways", tileClassName: "bg-sky-50 text-sky-600" },
  community: { label: "Community", tileClassName: "bg-rose-50 text-rose-500" },
  schools: { label: "Schools and organisations", tileClassName: "bg-violet-50 text-violet-600" },
  environment: { label: "Environment", tileClassName: "bg-lime-50 text-lime-700" },
  other: { label: "Other", tileClassName: "bg-slate-100 text-slate-600" },
} as const;

export type EventIconCategory = keyof typeof EVENT_ICON_CATEGORIES;

interface EventIconDefinition {
  key: string;
  label: string;
  category: EventIconCategory;
  icon: LucideIcon;
}

export const EVENT_ICONS = [
  { key: "park", label: "Park", category: "nature", icon: Park },
  { key: "tree-pine", label: "Pine tree", category: "nature", icon: TreePine },
  { key: "trees", label: "Woodland", category: "nature", icon: Trees },
  { key: "flower", label: "Flower", category: "nature", icon: Flower2 },

  { key: "waves", label: "Waves", category: "coastal", icon: Waves },
  { key: "fish", label: "Fish", category: "coastal", icon: Fish },
  { key: "shell", label: "Shell", category: "coastal", icon: Shell },
  { key: "ship", label: "Boat", category: "coastal", icon: Ship },

  { key: "users", label: "Community", category: "community", icon: Users },
  { key: "handshake", label: "Handshake", category: "community", icon: Handshake },
  { key: "heart-handshake", label: "Helping hands", category: "community", icon: HeartHandshake },
  { key: "house", label: "Neighbourhood", category: "community", icon: House },

  { key: "graduation-cap", label: "Students", category: "schools", icon: GraduationCap },
  { key: "school", label: "School", category: "schools", icon: School },
  { key: "building", label: "Workplace", category: "schools", icon: Building2 },

  { key: "recycle", label: "Recycling", category: "environment", icon: Recycle },
  { key: "sprout", label: "Seedling", category: "environment", icon: Sprout },
  { key: "earth", label: "Planet", category: "environment", icon: Earth },
  { key: "paw-print", label: "Wildlife", category: "environment", icon: PawPrint },
  { key: "footprints", label: "Walk", category: "environment", icon: Footprints },

  { key: "trash-2", label: "Trash Can", category: "other", icon: Trash2 },
  { key: "bike", label: "Cycling", category: "other", icon: Bike },
  { key: "calendar-days", label: "Calendar", category: "other", icon: CalendarDays },
] as const satisfies readonly EventIconDefinition[];

export type EventIconKey = (typeof EVENT_ICONS)[number]["key"];

/** Shown when an event has no icon, or its stored key is no longer in the allowlist. Not itself selectable. */
export const DEFAULT_EVENT_ICON = {
  label: "Default",
  icon: Leaf,
  tileClassName: "bg-brand/10 text-brand",
} as const;

export interface ResolvedEventIcon {
  /** Null for the default icon. */
  key: EventIconKey | null;
  label: string;
  icon: LucideIcon;
  tileClassName: string;
}

// A Map, not an object, so keys like "constructor" or "__proto__" can never match.
const ICONS_BY_KEY: ReadonlyMap<string, (typeof EVENT_ICONS)[number]> = new Map(
  EVENT_ICONS.map((definition) => [definition.key, definition] as const),
);

export function isEventIconKey(value: unknown): value is EventIconKey {
  return typeof value === "string" && ICONS_BY_KEY.has(value);
}

/** Resolves a stored key to its icon. Null, missing and unknown keys all resolve to the default icon. */
export function getEventIcon(key: string | null | undefined): ResolvedEventIcon {
  const definition = isEventIconKey(key) ? ICONS_BY_KEY.get(key) : undefined;
  if (!definition) return { key: null, ...DEFAULT_EVENT_ICON };

  return {
    key: definition.key,
    label: definition.label,
    icon: definition.icon,
    tileClassName: EVENT_ICON_CATEGORIES[definition.category].tileClassName,
  };
}

/** Icons grouped by category, in display order, for the picker. */
export function getEventIconGroups() {
  return (Object.keys(EVENT_ICON_CATEGORIES) as EventIconCategory[]).map((category) => ({
    category,
    label: EVENT_ICON_CATEGORIES[category].label,
    icons: EVENT_ICONS.filter((definition) => definition.category === category),
  }));
}

export type ParsedEventIconKey = { ok: true; key: EventIconKey | null } | { ok: false; error: string };

/**
 * Server-side validation for a submitted `icon_key`. An absent or empty value
 * means "no icon" (`null`); anything else must be an exact allowlist key.
 */
export function parseEventIconKey(value: FormDataEntryValue | null): ParsedEventIconKey {
  if (value === null || value === "") return { ok: true, key: null };
  if (isEventIconKey(value)) return { ok: true, key: value };
  return { ok: false, error: "Please choose an icon from the list." };
}

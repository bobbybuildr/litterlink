# LitterLink — Database Schema

## Enums

```sql
event_status:       'draft' | 'published' | 'completed' | 'cancelled'
participant_status: 'confirmed' | 'waitlisted' | 'cancelled'
```

## Tables

### `profiles`

Auto-created on sign-up via a `on_auth_user_created` trigger (reads `raw_user_meta_data`).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, FK → `auth.users` |
| `display_name` | TEXT \| null | |
| `postcode` | TEXT \| null | User's home postcode |
| `avatar_url` | TEXT \| null | Public URL in `avatars` storage bucket |
| `created_at` | TIMESTAMPTZ | |

### `events`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `organiser_id` | UUID | FK → `profiles` |
| `title` | TEXT | |
| `description` | TEXT \| null | |
| `location_postcode` | TEXT | Normalised canonical UK postcode |
| `latitude` | FLOAT | From `postcodes.io` geocoding |
| `longitude` | FLOAT | From `postcodes.io` geocoding |
| `address_label` | TEXT \| null | Human-readable location name |
| `starts_at` | TIMESTAMPTZ | |
| `ends_at` | TIMESTAMPTZ \| null | |
| `max_attendees` | INT \| null | Null = unlimited |
| `status` | `event_status` | Default `'published'` |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `organiser_id`, `(status, starts_at)`, `(latitude, longitude)`

### `event_participants`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `event_id` | UUID | FK → `events` |
| `user_id` | UUID | FK → `profiles` |
| `status` | `participant_status` | Default `'confirmed'` |
| `joined_at` | TIMESTAMPTZ | |

**Indexes:** `event_id`, `user_id`

### `event_stats`

One row per event (unique on `event_id`). Written when organiser logs impact after the event.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `event_id` | UUID | Unique FK → `events` |
| `bags_collected` | INT \| null | |
| `actual_attendees` | INT \| null | |
| `duration_hours` | NUMERIC(4,1) \| null | Must be > 0 |
| `litter_types` | TEXT[] \| null | e.g. `{plastic, glass, cigarettes}` |
| `hotspot_severity` | SMALLINT \| null | 1–5 scale |
| `notable_brands` | TEXT \| null | Free-text brand notes |
| `notes` | TEXT \| null | General organiser notes |

### `event_photos`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `event_id` | UUID | FK → `events` |
| `uploaded_by` | UUID | FK → `profiles` |
| `storage_path` | TEXT | Path in `event-photos` storage bucket |
| `created_at` | TIMESTAMPTZ | |

**Index:** `event_id`

## View: `events_with_counts`

A Supabase view (not in migrations — created via dashboard or separately). Extends `events` with:

| Column | Type | Notes |
|---|---|---|
| `organiser_name` | TEXT | From joined `profiles.display_name` |
| `organiser_avatar` | TEXT | From joined `profiles.avatar_url` |
| `confirmed_count` | BIGINT | COUNT of `event_participants` where `status = 'confirmed'` |

All data-fetching helpers in `src/lib/events.ts` query this view, not the raw `events` table.

## SQL Function

```sql
haversine_distance(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT) RETURNS FLOAT
```

Returns distance in kilometres using the Haversine formula. IMMUTABLE. Used for proximity filtering (though the app currently also implements this client-side in `src/lib/events.ts`).

## Storage Buckets

### `event-photos` (public)
- Path pattern: `{event_id}/{user_id}/{filename}`
- RLS: public read, authenticated upload, owner delete (matched by second path segment)

### `avatars` (public, 5 MB limit, JPEG/PNG/WebP only)
- Path pattern: `{user_id}/avatar.{ext}`
- RLS: public read, owner upload/update/delete (first path segment = `auth.uid()`)

## Row-Level Security Summary

| Table | Read | Write |
|---|---|---|
| `profiles` | Public | Owner only |
| `events` | Public (published/completed; organiser sees own drafts) | Organiser only; delete only for drafts |
| `event_participants` | Own rows + organiser sees all for their events; confirmed rows public | Self |
| `event_stats` | Organiser only | Organiser only |
| `event_photos` | Public | Authenticated upload; owner delete |

## TypeScript Types

Hand-written in `src/types/database.ts`. **Not auto-generated from Supabase.**

```ts
import type { Database } from "@/types/database";

type EventRow         = Database["public"]["Tables"]["events"]["Row"];
type ProfileRow       = Database["public"]["Tables"]["profiles"]["Row"];
type ParticipantRow   = Database["public"]["Tables"]["event_participants"]["Row"];
type EventStatsRow    = Database["public"]["Tables"]["event_stats"]["Row"];

type EventStatus      = "draft" | "published" | "completed" | "cancelled";
type ParticipantStatus = "confirmed" | "waitlisted" | "cancelled";
```

Extended types defined in `src/lib/events.ts`:

```ts
type EventWithCount  // EventRow + organiser_name, organiser_avatar, confirmed_count
type EventWithStats  // EventWithCount + event_stats row (nullable)
```

# LitterLink — Database Schema

## Enums

```sql
event_status:                  'draft' | 'published' | 'completed' | 'cancelled'
participant_status:            'confirmed' | 'waitlisted' | 'cancelled'
organiser_application_status:  'pending' | 'approved' | 'rejected'
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
| `is_verified_organiser` | BOOLEAN | Default `false` — set to `true` by admin approval |
| `is_admin` | BOOLEAN | Default `false` — set manually in DB |
| `created_at` | TIMESTAMPTZ | |

### `events`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `organiser_id` | UUID \| null | FK → `profiles` ON DELETE SET NULL |
| `group_id` | UUID \| null | FK → `groups` ON DELETE SET NULL |
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
| `organiser_contact_details` | TEXT \| null | Free-text contact info provided by organiser |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `organiser_id`, `group_id`, `(status, starts_at)`, `(latitude, longitude)`

**Constraint:** `organiser_contact_details IS NULL OR organiser_id IS NOT NULL` — contact details are cleared if the organiser deletes their account

### `event_participants`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `event_id` | UUID | FK → `events` |
| `user_id` | UUID | FK → `profiles` |
| `status` | `participant_status` | Default `'confirmed'` |
| `joined_at` | TIMESTAMPTZ | |

**Indexes:** `event_id`, `user_id`, composite `(event_id, user_id)`

**DB Trigger:** `enforce_event_capacity` — BEFORE INSERT, raises `SQLSTATE P0001 / 'event_full'` if `confirmed_count >= max_attendees`

### `event_stats`

One row per event (unique on `event_id`). Written when organiser logs impact after the event.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `event_id` | UUID | Unique FK → `events` |
| `bags_collected` | INT \| null | |
| `weight_kg` | NUMERIC \| null | Collected weight in kg — in schema/types but no UI yet |
| `area_covered_sqm` | NUMERIC \| null | Area covered — in schema/types but no UI yet |
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

### `groups`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | |
| `slug` | TEXT | Unique URL-safe identifier |
| `description` | TEXT \| null | |
| `logo_url` | TEXT \| null | Public URL in `group-logos` storage bucket |
| `website_url` | TEXT \| null | |
| `social_url` | TEXT \| null | |
| `contact_email` | TEXT \| null | |
| `group_type` | TEXT | One of: `'community' \| 'school' \| 'corporate' \| 'council' \| 'charity' \| 'other'` |
| `created_by` | UUID \| null | FK → `profiles` ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `slug`, `created_by`

### `organiser_applications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | Unique FK → `profiles` ON DELETE CASCADE |
| `motivation` | TEXT | Required — why they want to organise |
| `experience` | TEXT \| null | Relevant experience |
| `organisation_name` | TEXT \| null | |
| `social_links` | TEXT \| null | |
| `status` | `organiser_application_status` | Default `'pending'` |
| `reviewed_at` | TIMESTAMPTZ \| null | Set on approve/reject |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `user_id`, `status`

### `email_preferences`

Auto-created when a profile is created (via `on_profile_created_email_preferences` trigger).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | Unique FK → `profiles` ON DELETE CASCADE |
| `event_notifications` | BOOLEAN | Default `true` — transactional join/leave/cancel emails |
| `organiser_status_updates` | BOOLEAN | Default `true` — application outcome emails |
| `new_nearby_events` | BOOLEAN | Default `false` — marketing opt-in |
| `marketing_emails` | BOOLEAN | Default `false` — marketing opt-in |
| `newsletter` | BOOLEAN | Default `false` — marketing opt-in |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |

## View: `events_with_counts`

Extends `events` with joined profile, group, and participant count data.

| Column | Type | Notes |
|---|---|---|
| `organiser_name` | TEXT | From joined `profiles.display_name` |
| `organiser_avatar` | TEXT | From joined `profiles.avatar_url` |
| `organiser_is_verified` | BOOLEAN | From joined `profiles.is_verified_organiser` |
| `group_name` | TEXT | From joined `groups.name` |
| `group_slug` | TEXT | From joined `groups.slug` |
| `organiser_contact_details` | TEXT | Passed through from `events` |
| `confirmed_count` | BIGINT | COUNT of `event_participants` where `status = 'confirmed'` |

All data-fetching helpers in `src/lib/events.ts` query this view, not the raw `events` table.

## SQL Function

```sql
haversine_distance(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT) RETURNS FLOAT
```

Returns distance in kilometres using the Haversine formula. IMMUTABLE. Used for proximity filtering (though the app currently also implements this client-side in `src/lib/events.ts`).

## DB Triggers

| Trigger | Table | Purpose |
|---|---|---|
| `on_auth_user_created` | `auth.users` | Auto-creates a `profiles` row from `raw_user_meta_data` |
| `on_profile_created_email_preferences` | `profiles` | Auto-creates an `email_preferences` row with defaults |
| `on_email_preferences_updated` | `email_preferences` | Keeps `updated_at` current |
| `enforce_event_capacity` | `event_participants` | BEFORE INSERT — raises `P0001/event_full` if `confirmed_count >= max_attendees` |

## Storage Buckets

### `event-photos` (public)
- Path pattern: `{event_id}/{user_id}/{filename}`
- RLS: public read, authenticated upload, owner delete (matched by second path segment)

### `avatars` (public, 5 MB limit, JPEG/PNG/WebP only)
- Path pattern: `{user_id}/avatar.{ext}`
- RLS: public read, owner upload/update/delete (first path segment = `auth.uid()`)

### `group-logos` (public, 5 MB limit, JPEG/PNG/WebP only)
- Path pattern: `{group_id}/logo.{ext}`
- RLS: public read, authenticated upload/update/delete

## Row-Level Security Summary

| Table | Read | Write |
|---|---|---|
| `profiles` | Public | Owner only; admin can update |
| `events` | Public (published/completed; organiser sees own drafts) | Organiser only; delete only for drafts |
| `event_participants` | Own rows + organiser sees all for their events; confirmed rows public | Self |
| `event_stats` | Organiser only | Organiser only |
| `event_photos` | Public | Authenticated upload; owner delete |
| `groups` | Public | Verified organiser (creator) only |
| `organiser_applications` | Owner sees own; admin sees all | Owner insert; admin update |
| `email_preferences` | Owner only | Owner only |

## TypeScript Types

Hand-written in `src/types/database.ts`. **Not auto-generated from Supabase.**

```ts
import type { Database } from "@/types/database";

type EventRow                    = Database["public"]["Tables"]["events"]["Row"];
type ProfileRow                  = Database["public"]["Tables"]["profiles"]["Row"];
type ParticipantRow              = Database["public"]["Tables"]["event_participants"]["Row"];
type EventStatsRow               = Database["public"]["Tables"]["event_stats"]["Row"];
type GroupRow                    = Database["public"]["Tables"]["groups"]["Row"];
type OrganiserApplicationRow     = Database["public"]["Tables"]["organiser_applications"]["Row"];
type EmailPreferencesRow         = Database["public"]["Tables"]["email_preferences"]["Row"];

type EventStatus                 = "draft" | "published" | "completed" | "cancelled";
type ParticipantStatus           = "confirmed" | "waitlisted" | "cancelled";
type OrganiserApplicationStatus  = "pending" | "approved" | "rejected";
```

Extended types defined in `src/lib/events.ts`:

```ts
type EventWithCount  // EventRow + organiser_name, organiser_avatar, organiser_is_verified,
                     //           confirmed_count, group_name, group_slug
type EventWithStats  // EventWithCount + event_stats row (nullable)
```

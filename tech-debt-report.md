# LitterLink — Tech Debt Report

**Date:** 17 September 2026
**Scope:** Full codebase audit — `src/`, `supabase/`, `scripts/`, build configuration
**Baseline health:** `npm run lint` passes clean (exit 0). `npx tsc --noEmit` passes clean (exit 0).

## Summary

The foundations are solid. Auth checks consistently use `getUser()` rather than `getSession()`, ownership is verified server-side before every mutation, RLS is enabled on all tables, rate limiting is DB-backed, and the capacity race condition is correctly handled by a database trigger rather than an application check.

The findings below concern resilience, correctness at scale, and maintainability. One finding is critical and should be addressed before any further feature work.

| Severity | Count |
|---|---|
| Critical | 1 (fixed) |
| High | 5 (1 fixed) |
| Medium | 11 (1 fixed) |
| Low | 9 |

---

## Critical

### C1 — ~~The entire `supabase/` directory is gitignored~~ ✅ Fixed

**Location:** `.gitignore` (lines containing `/supabase` and `/supabase/migrations`)

`git ls-files supabase` previously returned **0 files**, against 119 tracked files overall.

This left untracked:

- All 32 SQL migrations (`0001_initial_schema.sql` through `0032_auto_enrol_group_creator.sql`)
- Every Row-Level Security policy
- Every database trigger — `enforce_event_capacity`, `prevent_creator_leaving_group`, `on_group_created_enrol_organiser`, `on_auth_user_created`, `on_profile_created_email_preferences`
- The `events_with_counts` view definition
- The `send-event-reminders` Deno Edge Function

The database schema existed only on one local disk and in the live Supabase project, with no schema history, no rollback path, no way to reproduce the database on a new machine, and no review trail for security-sensitive RLS changes.

**Resolution**

1. Removed `/supabase` and `/supabase/migrations` from `.gitignore`.
2. Committed the full directory (all 32 migrations and the `send-event-reminders` edge function).
3. Added narrow ignores for local CLI state only:
   ```gitignore
   /supabase/.temp/
   /supabase/.branches/
   ```

`/docs` remains gitignored — left as-is per the "consider" note, not part of this fix.

---

## High

### H1 — `public_visibility` privacy opt-out is never enforced

**Location:** `src/app/profile/[id]/page.tsx`, `supabase/migrations/0023_public_profiles.sql`

Migration 0023 states in its header comment:

> The `public_visibility` flag is enforced at the application layer in the `/profile/[id]` page (`notFound()` if false).

It is not. A workspace-wide search shows the column referenced **only** in `src/types/database.ts`. The profile page selects `id, display_name, username, bio, avatar_url, social_url, is_verified_organiser, created_at` and never reads the flag.

A user who opts out of public visibility still has their full profile, bio, social link, organised events, attended events, impact stats, and group memberships rendered to any signed-in visitor. Given the claims made in `src/app/privacy/page.tsx`, this is a data-protection exposure rather than a cosmetic bug.

**Suggested fix**

1. Add `public_visibility` to the profile select in both `generateMetadata` and the page component.
2. Call `notFound()` when the flag is `false` (allowing the owner to view their own page).
3. Preferably also enforce it in RLS so the Supabase API cannot leak the row directly:
   ```sql
   -- profiles: restrict public read of opted-out profiles to the owner
   ```
4. Expose the toggle in `src/app/profile/ProfileForm.tsx` — there is currently no UI to set it.

### H2 — ~~Silent row-limit truncation corrupts aggregate statistics~~ ✅ Fixed

**Location:** `src/app/impact/page.tsx`, `src/lib/events.ts`, `src/app/events/page.tsx`

PostgREST caps responses at 1000 rows by default. The following queries have no `limit`, no `.range()`, and no count safeguard:

| Query | File | Consequence |
|---|---|---|
| `event_stats` selected wholesale to compute national totals | `src/app/impact/page.tsx` | Bags, hours, and volunteer totals silently under-report past 1000 stat rows |
| All `group_members` and all group-linked `events` | `src/lib/events.ts` (`getPublishedGroups`) | Member counts and featured-group scoring become wrong |
| `getPublishedEvents({ limit: 100 })` then client-side pagination | `src/lib/events.ts` / `src/app/events/page.tsx` | Events beyond the first 100 in a date range silently vanish from search results |
| `event_stats` via `.in(...)` on group completed events | `src/app/groups/[slug]/page.tsx` | Group impact stats truncate |

The failure mode is the worst kind — no error, no warning, just quietly incorrect national impact figures, which are the product's headline claim.

**Resolution**

1. Added `supabase/migrations/0033_impact_and_group_aggregation_views.sql`, creating three `security_invoker` views that move aggregation into Postgres: `national_impact_stats` (pre-summed bags/volunteers/hours), `litter_type_counts` (frequency per litter type), and `groups_with_counts` (see M10).
2. `src/app/impact/page.tsx` now reads totals and litter-type frequencies from those views instead of pulling every `event_stats` row; the remaining per-event breakdown (top areas/organisers/groups) is scoped to only the relevant event ids and batched at 1000 ids per request.
3. `getPublishedEvents` in `src/lib/events.ts` no longer caps at 100 rows — it paginates with `.range()` until every matching row is fetched.
4. `getEventsByGroupId` and the group impact stats query in `src/app/groups/[slug]/page.tsx` now paginate/batch the same way, so a very active group can't silently truncate either.

### H3 — Host header trusted when constructing email links

**Location:** `src/app/(auth)/actions.ts`

```ts
async function getSiteUrl() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
```

This value becomes `emailRedirectTo` for signup confirmation emails and confirmation resends, and the OAuth `redirectTo`. A spoofed `Host` header produces confirmation links pointing at an attacker-controlled domain. Supabase's redirect allow-list is the only mitigation standing between this and link-hijack account takeover.

**Suggested fix**

Use the canonical site URL, which is already defined and used in twelve places across `src/lib/email.ts`:

```ts
async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  // dev fallback only
  const headersList = await headers();
  return `http://${headersList.get("host") ?? "localhost:3000"}`;
}
```

### H4 — No error boundaries anywhere in the app

**Location:** `src/app/`

The only Next.js special file present is `src/app/not-found.tsx`. There is no `error.tsx` and no `global-error.tsx` at any level.

A postcodes.io outage, a Supabase connection blip, or any unhandled throw inside a Server Component drops the user on the default Next.js error screen — unbranded, with no recovery action and no telemetry.

**Suggested fix**

1. Add `src/app/error.tsx` with a reset button and branded styling.
2. Add `src/app/global-error.tsx` for root-layout failures.
3. Consider route-level boundaries for the data-heavy segments: `/events`, `/groups`, `/impact`, `/dashboard`.

### H5 — No test suite

**Location:** Project-wide

No test runner is configured, no test files exist, and there is no CI workflow.

Untested surface includes every authorisation branch in every Server Action, the event capacity race condition, `londonToUTC` BST/GMT boundary handling, haversine radius filtering, the open-redirect validation in `signInWithEmail`, and all rate-limit predicates. This is precisely the logic where a silent regression is most expensive.

**Suggested fix**

1. Add Vitest and cover the pure functions in `src/lib/` first — `londonToUTC`, `haversineKm`, `sanitizeText`, `slugify`, `isRescheduleNotificationRateLimited`. Fast wins, no mocking required.
2. Add Playwright for the critical flows: sign up, create event, join event, leave event, submit stats.
3. Wire both into a GitHub Actions workflow alongside `lint` and `tsc --noEmit`.

---

## Medium

### M1 — Environment variables are unvalidated

**Location:** `src/lib/supabase/server.ts`, `client.ts`, `middleware.ts`, plus `SUPABASE_SECRET_KEY` in four action files

Six files use `process.env.X!` non-null assertions. A missing secret surfaces as an opaque runtime failure deep inside a Server Action rather than as a startup error.

**Suggested fix**

Create `src/lib/env.ts` that validates every required variable at module load and exports typed values. Import it from the Supabase client factories so it runs early.

### M2 — N+1 privileged API calls when cancelling an event

**Location:** `src/app/events/actions.ts`, `supabase/functions/send-event-reminders/index.ts`

```ts
Promise.all(participantIds.map((id) => admin.auth.admin.getUserById(id)))
```

One service-role HTTP request per confirmed participant, unbounded by attendee count. A 200-person event fires 200 privileged calls. The reminders Edge Function has the same shape, executed sequentially in a `for` loop.

**Suggested fix**

Store `email` on `profiles`, populated by the existing `on_auth_user_created` trigger, and read it in a single query. Alternatively batch via one service-role query against `auth.users`.

### M3 — No server-side URL scheme validation on group links

**Location:** `src/app/groups/create/actions.ts`, `src/app/groups/[slug]/edit/actions.ts`

```ts
const websiteUrl = (formData.get("website_url") as string | null)?.trim() || null;
```

No scheme check. Normalisation lives in `src/components/UrlInput.tsx` as an `onBlur` handler — client-side only, trivially bypassed by posting the form directly. A `javascript:` value is stored and rendered into an `href` on the group page.

`src/app/profile/actions.ts` already does this correctly:

```ts
if (socialUrl !== null && !/^https?:\/\//.test(socialUrl)) {
  return { error: "Website or social link must start with http:// or https://." };
}
```

**Suggested fix**

Extract that check into a shared `validateHttpUrl()` helper and apply it to `website_url` and `social_url` in both group actions.

### M4 — Substantial duplicated logic

| Duplicated | Locations |
|---|---|
| `londonToUTC` (byte-identical) | `src/app/events/create/actions.ts`, `src/app/events/[id]/edit/actions.ts` |
| `slugify` | `src/app/groups/create/actions.ts`, `src/app/groups/[slug]/edit/actions.ts` |
| `extractFields` + `fail` | Three action files |
| `GROUP_TYPE_LABELS` re-declared inline | `src/app/dashboard/page.tsx`, despite `src/lib/constants.ts` existing for exactly this |
| Upload validation (`allowedTypes` set, 5 MB cap) | Four locations across events, groups, and profile actions |

**Suggested fix**

- `src/lib/datetime.ts` — `londonToUTC` (pair it with the existing `utcToLondonDatetimeLocal` in `src/lib/utils.ts`)
- `src/lib/slug.ts` — `slugify`
- `src/lib/forms.ts` — `extractFields`, `fail`
- `src/lib/uploads.ts` — `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES`, `validateImageUpload()`
- Import `GROUP_TYPE_LABELS` from `src/lib/constants.ts` in the dashboard

### M5 — Inconsistent Server Action error contracts

**Location:** All `actions.ts` files

Three patterns coexist:

1. `{ error: string | null }` — `src/app/events/actions.ts`, `src/app/groups/actions.ts`
2. `redirect("/path?error=...")` — `src/app/groups/create/actions.ts`, `src/app/events/[id]/stats/actions.ts`
3. `{ error, fields }` state object — `src/app/events/[id]/edit/actions.ts`, `src/app/groups/[slug]/edit/actions.ts`

Several paths also return raw `error.message` from Postgres straight to the client, leaking internal detail.

**Suggested fix**

Standardise on the `{ error, fields }` state-object contract with `useActionState`. Never return `error.message` directly — map known codes (`23505`, `P0001`) to user-facing strings and fall back to a generic message.

### M6 — In-process email rate limiter leaks memory and is ineffective in serverless

**Location:** `src/lib/email.ts`

```ts
const emailRateLimitMap = new Map<string, number>();
```

Entries are never evicted — unbounded growth on long-lived instances. The map is also per-instance, so it provides no real protection across serverless invocations, which is the actual deployment model.

**Suggested fix**

Move the cooldown to the database alongside the existing helpers in `src/lib/ratelimit.ts`. If the in-process map is kept as a cheap first line of defence, add TTL eviction.

### M7 — `/api/reverse-geocode` is an unauthenticated open proxy

**Location:** `src/app/api/reverse-geocode/route.ts`

Coordinates are validated correctly, but the route has no auth and no rate limit. It can be driven at volume to proxy traffic to postcodes.io under your IP and reputation.

**Suggested fix**

Add a per-IP rate limit (the `x-forwarded-for` header on Vercel), and consider requiring a session.

### M8 — Group membership changes do not revalidate the discovery page

**Location:** `src/app/groups/actions.ts`

`joinGroup` and `leaveGroup` call `revalidatePath("/groups/" + slug)` only. But `/groups` sorts cards by member count and derives the featured-group score from recent joins, and `/dashboard` lists memberships. Both go stale immediately.

**Suggested fix**

Add `revalidatePath("/groups")` and `revalidatePath("/dashboard")` to both actions.

### M9 — Hand-written database types drift from the schema

**Location:** `src/types/database.ts`

385 lines maintained by hand with no generation step. The cost is already visible in `src/lib/events.ts`:

```ts
// The hand-written Database type carries no relationship metadata, so the
// Supabase client infers `never[]` for the joined select. Cast via unknown.
```

**Suggested fix**

Add a script and regenerate on every schema change:

```json
"types": "supabase gen types typescript --linked > src/types/database.ts"
```

This also restores relationship inference and removes the `as unknown as` casts.

### M10 — ~~`getPublishedGroups()` is a full-table scan aggregated in JavaScript~~ ✅ Fixed

**Location:** `src/lib/events.ts`

Every `/groups` request reads all groups, all `group_members`, and all group-linked events, then builds member counts, upcoming-event counts, and a weighted activity score in memory. The code acknowledges this:

> Counts are computed client-side since there's no `groups_with_counts` view yet.

**Resolution**

Added the `groups_with_counts` view in `supabase/migrations/0033_impact_and_group_aggregation_views.sql`, mirroring the `events_with_counts` pattern with `security_invoker = true`. `getPublishedGroups()` in `src/lib/events.ts` now does a single `select("*")` against the view instead of three unbounded table reads reduced in JavaScript, resolving the truncation risk noted in H2 as well.

### M11 — `sanitizeText` is naive and applied inconsistently

**Location:** `src/lib/sanitize.ts`, `src/app/groups/create/actions.ts`

```ts
return input.replace(/<[^>]*>/g, "").trim();
```

Mishandles unclosed tags and `>` characters inside attribute values. More significantly, application is uneven — `groups/create/actions.ts` sanitizes `postcode` and `location_name` but leaves `name`, `description`, and `contact_email` raw.

**Suggested fix**

Apply `sanitizeText` uniformly to all free-text fields, or drop it in favour of a well-tested library. Document the policy so new fields are not missed.

---

## Low

### L1 — `impact/page.tsx` is 849 lines mixing three concerns

Data fetching, aggregation, and presentation in a single file. Extract `getImpactData` and the period helpers into `src/lib/impact.ts`.

### L2 — Proxy route protection does not match the documentation

`src/lib/supabase/middleware.ts` guards only `/dashboard`, `/events/create`, and `/profile`. The docs in `AGENTS.md` and `docs/context/routes-and-features.md` also claim `/events/[id]/edit`. Page-level checks do cover it, so this is a documentation accuracy issue rather than a security hole — but the two should agree.

### L3 — No `loading.tsx` anywhere

No streaming or skeleton states on data-heavy routes. `/impact` in particular runs nine parallel queries before rendering anything.

### L4 — Dead schema columns

`weight_kg` and `area_covered_sqm` exist on `event_stats` and in `src/types/database.ts` with no UI in any form. Either build the inputs or drop the columns.

### L5 — Unreachable UI option remains reachable by URL

The `year` period is commented out of `getPeriodOptions()` in `src/app/impact/page.tsx`, but `isPeriod` still accepts it and `getPeriodRange` still handles it, so `?orgPeriod=year` works. Remove it from the `Period` union or restore the option.

### L6 — No CI, no dependency audit, no typecheck script

`package.json` defines only `dev`, `build`, `start`, and `lint`. Add:

```json
"typecheck": "tsc --noEmit",
"audit": "npm audit --audit-level=high"
```

and a GitHub Actions workflow running lint, typecheck, and tests on every push.

### L7 — One-off backfill script committed with no provenance

`scripts/backfill-event-locations.mjs` has no record of whether it has been run, against which environment, or whether it is idempotent. Add a header comment or move it to an `archive/` directory.

### L8 — Client-side pagination

`/events` and `/groups` both fetch the full result set then `.slice()`. Combined with H2, this means the page size is a display concern layered over an already-truncated dataset.

### L9 — Server Action body size limit exceeds the upload cap

`next.config.ts` sets `bodySizeLimit: "11mb"` while every upload path enforces a 5 MB cap. Tighten to roughly `6mb` to reduce the accepted payload surface.

---

## Suggested order of work

1. **C1** — commit `supabase/`. Every other item is reversible; losing the schema is not.
2. **H1** and **H3** — small, contained changes with genuine privacy and security impact.
3. **H2** — the impact figures are the product's headline claim and need to be correct.
4. **M1**, **M4**, **M9** — inexpensive groundwork that makes everything after it safer to change.
5. **H4** and **H5** — resilience and a regression net before the next feature lands.
6. Remaining Medium items, then Low.

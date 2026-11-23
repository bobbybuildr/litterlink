# LitterLink — Combined SEO Audit and Tech Debt Report

**Date:** 23 November 2026
**Sources:** [seo-audit-report.md](./seo-audit-report.md) (4 October 2026, last updated 25 October 2026) and [tech-debt-report.md](./tech-debt-report.md) (17 September 2026). Both originals are unchanged.
**Scope:** Technical SEO and a full codebase audit across `src/`, `supabase/`, `scripts/`, `robots.ts`, `sitemap.ts`, metadata, routing and build configuration. Next.js 16 behaviour was checked against the installed docs in `node_modules/next/dist/docs/`.
**Health:** `npm test` (291 tests), `npm run typecheck`, `npm run lint` and `npm run build` all passed at the last SEO update. The tech debt baseline (`npm run lint`, `npx tsc --noEmit`) was clean when audited on 17 September 2026.

**Reading this document**

- Both reports numbered findings `C1`, `H1`, `M1` and so on, so the IDs would clash. Tech debt findings are now `TD-…` and SEO findings are `SEO-…`. Every cross-reference has been renamed to match.
- **Outstanding actions come first** (section 2). Where the two reports left work on the same thing, the actions are merged and marked **Merged**.
- Fixed findings are kept in full in Parts A and B as a record of what changed and why.

| Section | Contents |
|---|---|
| 1. Summary | Combined counts, SEO workstreams, delivery log |
| 2. Outstanding actions | A1–A8 (two merged), suggested order, watch list |
| 3. Deployment and operations notes | Migrations, environment variables, Search Console |
| Part A | Tech debt findings (`TD-…`) |
| Part B | SEO findings (`SEO-…`) |
| Part C | Reference: files changed, conventions for new pages, verification table |
| Part D | Delivery order already completed |

---

## 1. Summary

**Tech debt.** The foundations are solid. Auth checks consistently use `getUser()` rather than `getSession()`, ownership is verified server-side before every mutation, RLS is enabled on all tables, rate limiting is DB-backed, and the capacity race condition is handled by a database trigger rather than an application check. The findings concerned resilience, correctness at scale and maintainability.

**SEO.** The basics were already sound: event and group content is server-rendered with real links, detail pages return genuine 404s, private routes redirect anonymous visitors, and `robots.ts`, `sitemap.ts` and a title template were in place. The serious gaps were about **indexing control and duplication**:

- Auth pages and the postcode filter could be indexed while echoing arbitrary text from the URL.
- Every page inherited the homepage's `og:url` and `og:title` from the root layout.
- No page had a canonical URL.
- Coming-soon mode only hid part of the site. (The mode has since been removed entirely; see SEO-C5.)

**Where things stand.** Every critical finding is fixed. Four findings are still open and two are partly fixed. They are tracked as eight outstanding actions in section 2.

| Severity | Total | Fixed | Partly fixed | Open |
|---|---|---|---|---|
| Critical | 6 | 6 | 0 | 0 |
| High | 15 | 14 | 1 (TD-H5) | 0 |
| Medium | 20 | 16 | 0 | 4 (TD-M2, TD-M6, TD-M9, SEO-M1) |
| Low | 9 | 8 | 1 (TD-L6) | 0 |
| **Total** | **50** | **44** | **2** | **4** |

By source: tech debt 26 findings (1 critical, 5 high, 11 medium, 9 low) and SEO 24 findings (5 critical, 10 high, 9 medium).

> The original SEO table listed one High finding as "partially fixed", but every High heading in that report (SEO-H1 to SEO-H10) is marked fixed. The table above follows the headings.

### SEO workstreams

| ID | Workstream | Status |
|---|---|---|
| W1 | Indexing controls | ✅ Done |
| W2 | Titles and shared metadata | ✅ Done |
| W3 | Canonical URLs and query-parameter duplicates | ✅ Done |
| W4 | Open Graph, X and share images | ✅ Done |
| W5 | Sitemap and robots | ✅ Done |
| W6 | Structured data (JSON-LD) | ✅ Done |
| W7 | Internal linking, content and headings | In progress: SEO-M2, SEO-M3 and SEO-M4 done; SEO-M1 open (action A5) |
| W8 | Core Web Vitals | ✅ Done |

### Delivery log

- **SEO W1–W6:** implemented. W4: default image, X card and generated event images 15 October 2026; generated group images and the `events_with_counts` place-name fix 16 October 2026. W5: complete sitemap 16 October 2026. W6: JSON-LD structured data 17 October 2026.
- **SEO W7:** heading structure (SEO-M2) and image SEO (SEO-M3) fixed 17 October 2026; thin past events (SEO-M4) fixed 23 October 2026.
- **SEO W8:** done, all fixed 25 October 2026: banner hydration mismatch and layout shift (SEO-M6), the proxy running on metadata files (SEO-M9) and server response time (SEO-M7).
- **Verification:** rendered `<head>` output, JSON-LD, `sitemap.xml` and `robots.txt` were checked against a local production build using a Googlebot user agent. Migration `0038` has been applied, so event titles show place names.
- **Tech debt:** one Critical, four High, eight Medium and eight Low findings fixed (see Part A).

---

## 2. Outstanding actions

Eight actions remain. Two merge work that the two reports left on the same subject (A1, A2). The rest come from a single report.

Priority follows the original severity. Status was re-checked against the repository on 23 November 2026.

| # | Action | From | Priority | Type |
|---|---|---|---|---|
| A1 | Automated regression net: end-to-end flows, authorisation, capacity trigger and SEO rules | TD-H5 + SEO verification | High | **Merged** |
| A2 | Generate database types from the schema | TD-M9 + SEO-H5, SEO-H8 | Medium | **Merged** |
| A3 | Remove the N+1 service-role calls when emailing participants | TD-M2 | Medium | Single report |
| A4 | Replace the in-process email cooldown | TD-M6 | Medium | Single report |
| A5 | Internal linking: homepage, `/impact` areas, `/events` ↔ `/groups` | SEO-M1 | Medium | Single report |
| A6 | Add an `audit` script | TD-L6 | Low | Single report |
| A7 | Production check of batched photo uploads | TD-L9 | Low | Single report |
| A8 | Search Console follow-ups | SEO deployment notes | Ongoing | Single report |

### A1 — Automated regression net **(Merged: TD-H5 + SEO verification)**

**Overlap.** TD-H5 stopped at unit tests and CI. What is left of it needs a disposable Supabase instance with seeded users. The SEO work was verified entirely by hand against a local production build with a Googlebot user agent (see "Verification" in Part C). Unit tests cover the pure builders and rules (`seo`, `sitemap`, `structured-data`, `search-params`, `html`, the proxy matcher and middleware), but nothing asserts the rendered pages. A regression in a canonical, a `noindex`, the sitemap or the JSON-LD would only show up in Search Console. Both gaps need the same fixture, so they are one piece of work.

**Actions**

1. Run a disposable Supabase instance in CI (`supabase start` with seeded users and events). Seed upcoming, past, cancelled, completed and stale published events (started more than 14 days ago and never wrapped up), plus a group. **(TD-H5)**
2. Add Playwright for the critical flows: sign up, create event, join event, leave event, submit stats. **(TD-H5)**
3. Test the Server Action authorisation branches and the `enforce_event_capacity` trigger. **(TD-H5)**
4. Add SEO smoke checks on the same fixtures, covering what is now checked by hand. **(Added by this merge)**
   - Canonical and robots meta on `/`, `/events`, a filtered `/events`, `/impact` and a period variant, an auth page, and a stale event.
   - `X-Robots-Tag: noindex, nofollow` on `/profile`, including the 307 for anonymous visitors.
   - `/sitemap.xml` and `/robots.txt` contents.
   - JSON-LD present and parseable on the homepage, an event page and a group page.

**Status.** The suite has grown from 107 unit tests (TD-H5, 17 September) to 291 (25 October). Steps 1–4 are not started. There are still no end-to-end tests.

### A2 — Generate database types from the schema **(Merged: TD-M9 + SEO-H5, SEO-H8)**

**Overlap.** TD-M9 asked for generated types because `src/types/database.ts` is hand-written (385 lines at the time) and forces `as unknown as` casts in `src/lib/events.ts`. The SEO work supplies two more reasons:

- **A drift that shipped.** `events_with_counts` was never rebuilt after migration `0031` added `location_outcode` and `location_admin_district`, yet the hand-written type already listed both fields. TypeScript saw nothing wrong, and event titles silently fell back to the postcode until migration `0038` (SEO-H5). Types generated from the database would have shown the view without those columns.
- **Hand-edited types on every migration.** Migration `0037` needed `group_slug_history` added to the file by hand (SEO-H8).

**Actions**

1. Add a script and regenerate on every schema change: `"types": "supabase gen types typescript --linked > src/types/database.ts"`.
2. After the first regeneration, review the diff for views and tables where the old hand-written type claimed columns the database does not have. `events_with_counts` is the known case.
3. Remove the `as unknown as` casts and the explanatory comment in `src/lib/events.ts`, since relationship inference returns.
4. Consider a CI step that fails when regenerating changes the committed file.

**Status.** Open (checked 23 November 2026): `package.json` has no `types` script and `src/types/database.ts` is still hand-edited. The original suggested order of work placed this early as cheap groundwork.

### A3 — Remove the N+1 service-role calls when emailing participants (TD-M2)

One service-role HTTP request is made per confirmed participant, with no cap on attendee count. A 200-person event fires 200 privileged calls.

**Status.** Open (checked 23 November 2026). The original report named two places. The same pattern also appears in a third:

| Location | Shape |
|---|---|
| `cancelEvent` in `src/app/events/actions.ts` | `Promise.all(participantIds.map((id) => admin.auth.admin.getUserById(id)))` |
| `updateEvent` reschedule notifications in `src/app/events/[id]/edit/actions.ts` | The same `Promise.all` over `getUserById` |
| `supabase/functions/send-event-reminders/index.ts` | `getUserById` once per row inside a sequential `for` loop |

**Action.** Look up all the emails in one query.

> **Caution added by this merge.** The original suggestion was to store `email` on `profiles`. `profiles` has the policy `"profiles: public read" … USING (true)` (`supabase/migrations/0001_initial_schema.sql`), so an `email` column there would be readable by everyone. Keep the address out of `profiles`. Use an owner-only table, or a `SECURITY DEFINER` function that only the service role can execute and that returns emails for a list of user ids.

**Related.** SEO-M8 records that the reminders Edge Function keeps its own `SITE_URL` fallback because Deno cannot import from `src/`. Fixing this action touches the same file; leave that fallback as it is.

### A4 — Replace the in-process email cooldown (TD-M6)

`src/lib/email.ts` still keeps `const emailRateLimitMap = new Map<string, number>()`. Entries are never evicted, so memory grows on long-lived instances. The map is also per-instance, so it gives no real protection across serverless invocations, which is the actual deployment model.

**Action.** Move the cooldown into the database beside the existing helpers in `src/lib/ratelimit.ts`. The `consume_rate_limit()` function from migration `0035` (TD-M7) is a ready-made fixed-window primitive. If the in-process map is kept as a cheap first line of defence, add TTL eviction.

**Status.** Open (checked 23 November 2026).

### A5 — Internal linking (SEO-M1)

Part of W7. Three items remain:

1. **Homepage links.** The homepage body has no event or group links. Add "Upcoming near you" and "Featured groups" sections. The body currently links only to `/events/create`, `/impact`, `/events` and `/sign-up`, and not to `/groups` at all. Keep the queries bounded, like `getLaterEvents()` (SEO-H9). Do not use the helpers that read every matching row (`getPublishedEvents`, `getPublishedGroups`; see TD-H2 and TD-L8).
2. **"Top areas" on `/impact`.** These are plain text. They need a destination first: the `/events` filters take a postcode and radius, not a district, and filtered variants are `noindex, follow` (SEO-C4, SEO-H9). A link adds a crawl path but not a new indexable page.
3. **`/events` ↔ `/groups`.** They link to each other only through the nav and footer.

Already done within this finding: related and nearby events on event pages, and `rel="nofollow"` on profile links (SEO-H2).

**Status.** Open (checked 23 November 2026: no homepage event or group sections).

### A6 — Add an `audit` script (TD-L6)

CI and `typecheck` were added under TD-H5. The remaining piece is `"audit": "npm audit --audit-level=high"` in `package.json`, ideally run in `.github/workflows/ci.yml`.

**Status.** Open (checked 23 November 2026: no `audit` script).

### A7 — Production check of batched photo uploads (TD-L9)

Photos now upload one per request, and `bodySizeLimit` is `2mb`. The remaining step is to confirm on the deployed site that 6 or more photos selected at once all upload. Vercel's 4.5 MB request cap does not apply locally, so end-to-end tests under A1 will not cover this.

### A8 — Search Console follow-ups (SEO deployment notes)

- Look in the Pages report for "Duplicate without user-selected canonical" and "Indexed, though blocked by robots.txt".
- Ongoing: watch the Events and Breadcrumbs reports under Enhancements as Google recrawls (W6).

### Suggested order of work

1. **A8** — Search Console checks. No code, so run it alongside everything else.
2. **A2** — generated database types. Cheap groundwork, and the original tech debt order placed it early. It makes every later schema change safer, including any migration A3 adds.
3. **A1** — the regression net, before the next feature lands.
4. **A3, A4** — email hardening. Both touch the email-sending path, and A4 can reuse `consume_rate_limit()`.
5. **A5** — internal linking, which closes W7.
6. **A6, A7** — small tidy-ups. A7 needs a production deployment.

The order already followed for the fixed findings is recorded in Part D.

### Watch list (no action needed now)

| Item | Source | Trigger |
|---|---|---|
| Split the sitemap with `generateSitemaps()` | SEO-H3 | Over 50,000 URLs (`SITEMAP_URL_LIMIT`; the route logs a warning). In Next 16 that serves `/sitemap/{id}.xml` with no automatic index, so `robots.ts` would need to list each file |
| Add a cookie line to the privacy policy (section 11) and bump `PRIVACY_LAST_UPDATED` | SEO-M6 | The beta banner is reactivated (`SHOW_BETA_BANNER`). It would set a first-party session cookie |
| Convert `src/app/(auth)/actions.ts` to the `FormState` contract | TD-M5 (out of scope) | Left alone on purpose: it passes through Supabase Auth messages and the resend-confirmation flow depends on them |
| Re-scrape share cards on Facebook, X and LinkedIn | SEO-H6 | After a major event or group edit. The `?<hash>` in the image URL is a build hash, not the content |
| `/groups/{old-slug}/edit` returns 404 | SEO-H8 | Owner-only page, low impact |
| No `ItemList` or breadcrumbs on `/events` and `/groups` | SEO-H7 | Google only shows event rich results from each event's own page |
| Raw `?postcode=` value in the RSC payload and filter input | SEO-C2 | Not visible text and the URL is `noindex` |
| Every page renders per request | SEO-M7 | Caching public pages would need the signed-in navbar out of the static shell, which is a larger change |
| `Navbar` runs one profile query for signed-in visitors | SEO-M7 | Anonymous visitors run none |
| Navbar claims rely on asymmetric JWT signing keys | SEO-M7 | With legacy HS256 keys `getClaims()` calls the Auth server each time and the saving disappears |

---

## 3. Deployment and operations notes

1. **Migrations:** `0037_group_slug_history.sql` and `0038_events_with_counts_location_display.sql` have both been applied. No migrations were outstanding at the last SEO update (25 October 2026).
2. **`COMING_SOON` environment variable:** removed from the hosting provider. Nothing reads it any more.
3. **Google Search Console:**
   - ✅ `sitemap.xml` submitted (16 October 2026).
   - ✅ URL Inspection run on `/`, an event page and a group page; no issues found (17 October 2026).
   - ✅ An upcoming event page and a group page passed the [Rich Results Test](https://search.google.com/test/rich-results), and the detected data is correct (17 October 2026).
   - Open: see A8.

---

## Part A — Tech debt findings

### TD-C1 — ~~The entire `supabase/` directory is gitignored~~ ✅ Fixed

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

### TD-H1 — ~~`public_visibility` privacy opt-out is never enforced~~ ✅ Fixed

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

**Resolution**

The opt-out was removed rather than enforced. Impact stats are recorded against events and groups regardless, and every identifying profile field (username, bio, avatar, social link) is already optional, so a visibility flag added little.

1. Added `supabase/migrations/0034_drop_profile_public_visibility.sql`, dropping the `public_visibility` column from `profiles`.
2. Removed `public_visibility` from the `profiles` Row/Insert/Update types in `src/types/database.ts`.
3. Added a bullet to section 5 of `src/app/privacy/page.tsx` stating that profile pages are visible to signed-in users and which fields are optional, so the policy no longer implies a hidden-profile option.

### TD-H2 — ~~Silent row-limit truncation corrupts aggregate statistics~~ ✅ Fixed

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

1. Added `supabase/migrations/0033_impact_and_group_aggregation_views.sql`, creating three `security_invoker` views that move aggregation into Postgres: `national_impact_stats` (pre-summed bags/volunteers/hours), `litter_type_counts` (frequency per litter type), and `groups_with_counts` (see TD-M10).
2. `src/app/impact/page.tsx` now reads totals and litter-type frequencies from those views instead of pulling every `event_stats` row; the remaining per-event breakdown (top areas/organisers/groups) is scoped to only the relevant event ids and batched at 1000 ids per request.
3. `getPublishedEvents` in `src/lib/events.ts` no longer caps at 100 rows — it paginates with `.range()` until every matching row is fetched.
4. `getEventsByGroupId` and the group impact stats query in `src/app/groups/[slug]/page.tsx` now paginate/batch the same way, so a very active group can't silently truncate either.

### TD-H3 — ~~Host header trusted when constructing email links~~ ✅ Fixed

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

**Resolution**

`getSiteUrl()` in `src/app/(auth)/actions.ts` now returns `process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk"`, matching the pattern already used in `src/lib/email.ts` and elsewhere. The `Host`/`X-Forwarded-Proto` headers are no longer read, and the now-unused `headers` import was removed.

The SEO work later centralised this: the auth actions and every email link now go through `absoluteUrl()` from `src/lib/seo.ts` (see SEO-M8).

### TD-H4 — ~~No error boundaries anywhere in the app~~ ✅ Fixed

**Location:** `src/app/`

The only Next.js special file present is `src/app/not-found.tsx`. There is no `error.tsx` and no `global-error.tsx` at any level.

A postcodes.io outage, a Supabase connection blip, or any unhandled throw inside a Server Component drops the user on the default Next.js error screen — unbranded, with no recovery action and no telemetry.

**Resolution**

1. Added a shared `src/components/ErrorState.tsx` presentational component (branded, matches the style of `src/app/not-found.tsx`) with an optional retry button.
2. Added `src/app/error.tsx` as the root-level error boundary, using `ErrorState` and Next.js 16's `retry()` prop (the successor to `reset()`).
3. Added `src/app/global-error.tsx` for root-layout failures — it defines its own `<html>`/`<body>` and imports `globals.css` directly, as required for `global-error.jsx` in this Next.js version.
4. Added route-level boundaries for the data-heavy segments: `src/app/events/error.tsx`, `src/app/groups/error.tsx`, `src/app/impact/error.tsx`, `src/app/dashboard/error.tsx`, each with a segment-specific message.
5. All error boundaries log the caught error via `console.error` in a `useEffect`.

`npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass clean with these files in place.

### TD-H5 — No test suite ⚠️ Partly fixed (unit tests + CI; no end-to-end tests yet)

**Location:** Project-wide

No test runner was configured, no test files existed, and there was no CI workflow.

Untested surface included every authorisation branch in every Server Action, the event capacity race condition, `londonToUTC` BST/GMT boundary handling, haversine radius filtering, the open-redirect validation in `signInWithEmail`, and all rate-limit predicates. This is precisely the logic where a silent regression is most expensive.

**Suggested fix**

1. Add Vitest and cover the pure functions in `src/lib/` first — `londonToUTC`, `haversineKm`, `readFormFields`, `escapeHtml`, `slugify`, `isRescheduleNotificationRateLimited`. Fast wins, no mocking required.
2. Add Playwright for the critical flows: sign up, create event, join event, leave event, submit stats.
3. Wire both into a GitHub Actions workflow alongside `lint` and `tsc --noEmit`.

**Resolution (steps 1 and 3)**

1. Added Vitest 4 (`vitest.config.mts`, Node environment, tsconfig `@/` paths resolved natively by Vite 8). Vitest 5 was not used because it needs `@types/node` 22+, and the project is on 20. Scripts: `npm test` (single run), `npm run test:watch`, and `npm run typecheck` (`next typegen && tsc --noEmit`, so `next-env.d.ts`, which is gitignored, exists in CI).
2. Tests are co-located as `src/lib/*.test.ts` (107 tests when first added; 291 by 25 October 2026 after the SEO work):
   - `datetime` — `londonToUTC` for GMT, BST, both 2026 clock-change days, BST midnight crossing the UTC date, and round-trips through `utcToLondonDatetimeLocal`.
   - `events` — `haversineKm` against known distances, symmetry and latitude scaling.
   - `input` — every `readFormFields` field type: normalisation, control/bidi stripping, no HTML stripping, required/optional, max length after normalisation, email/URL/postcode rules (including `javascript:`/`data:` rejection), and first-error ordering.
   - `html` — `escapeHtml`, including the unclosed-tag payload from TD-M11.
   - `slug` — `slugify`.
   - `ratelimit` — `isRescheduleNotificationRateLimited` at the 15-minute boundary; `isEventCreationRateLimited`, `isJoinRateLimited` and `isGroupJoinRateLimited` against a stub client (limit boundaries, `null` count, user and time-window filters); `consumeGeocodeRateLimit` (hashed key, `x-forwarded-for`/`x-real-ip`, raw IP never sent, fails open).
   - `redirect` — see below.
3. `.github/workflows/ci.yml` runs `npm ci`, `lint`, `typecheck` and `test` on Node 24 for pushes to `master` and all pull requests.

**Open redirect found while testing.** The `signInWithEmail` check (`startsWith("/") && !startsWith("//")`) let through `/\evil.com` and `/\t/evil.com`, which browsers read as `//evil.com`. The same check guarded the `oauth_redirect` cookie in `src/app/auth/callback/route.ts`. That route also took `?next=` with no validation and built `${origin}${next}`, so `?next=@evil.com` produced `https://litterlink.co.uk@evil.com`, which goes to `evil.com`. All three now use `safeRedirectPath()` in the new `src/lib/redirect.ts`. It resolves the target the way a browser would and only accepts it if the origin stays the same. `signInWithGoogle` uses it too.

**Still to do:** step 2 (Playwright). The critical flows need a disposable Supabase instance (`supabase start` + seeded users) in CI, which is a separate piece of work. Server Action authorisation branches and the capacity trigger are still untested. **Tracked as action A1, merged with the SEO verification work.**

---

### TD-M1 — ~~Environment variables are unvalidated~~ ✅ Fixed

**Location:** `src/lib/supabase/server.ts`, `client.ts`, `middleware.ts`, plus `SUPABASE_SECRET_KEY` in four action files

Six files use `process.env.X!` non-null assertions. A missing secret surfaces as an opaque runtime failure deep inside a Server Action rather than as a startup error.

**Resolution**

Rather than one unrestricted `src/lib/env.ts` shared by both browser and server code, the validated variables are split by trust boundary:

1. `src/lib/env/public.ts` (`publicEnv`) validates only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` at module load. It has no server-only import, so it's safe to use from the browser client, the server client, and middleware.
2. `src/lib/env/server.ts` (`serverEnv`) validates `SUPABASE_SECRET_KEY` and starts with `import "server-only"`, so importing it from anything reachable by the browser is a build-time error, not just a convention.
3. `src/lib/supabase/client.ts`, `server.ts`, and `middleware.ts` now read from `publicEnv` instead of `process.env.X!`.
4. `src/lib/supabase/admin.ts` adds a `createAdminClient()` factory built on `publicEnv` + `serverEnv`, replacing the four separate inline `createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)` call sites in `src/app/admin/applications/actions.ts`, `src/app/events/actions.ts`, `src/app/events/[id]/edit/actions.ts`, and `src/app/profile/actions.ts`.

A missing variable now throws `Missing required environment variable: X` the first time the relevant module loads, rather than surfacing as an opaque runtime failure deep inside a Server Action.

### TD-M2 — N+1 privileged API calls when cancelling an event — Open (action A3)

**Location:** `src/app/events/actions.ts`, `src/app/events/[id]/edit/actions.ts`, `supabase/functions/send-event-reminders/index.ts`

```ts
Promise.all(participantIds.map((id) => admin.auth.admin.getUserById(id)))
```

One service-role HTTP request per confirmed participant, unbounded by attendee count. A 200-person event fires 200 privileged calls. The reminders Edge Function has the same shape, executed sequentially in a `for` loop. (The reschedule notifications in `updateEvent` use the same `Promise.all` pattern; this was found on 23 November 2026.)

**Suggested fix**

Read all the emails in a single query. The original suggestion was to store `email` on `profiles`, populated by the existing `on_auth_user_created` trigger, or to batch via one service-role query against `auth.users`.

**Caution:** `profiles` is publicly readable (`"profiles: public read" … USING (true)`, `0001_initial_schema.sql`), so an `email` column there would expose every address. See A3 for safer options.

### TD-M3 — ~~No server-side URL scheme validation on group links~~ ✅ Fixed

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

**Resolution**

Added `validateHttpUrl()` in `src/lib/url.ts` and applied it to `website_url` and `social_url` in both `src/app/groups/create/actions.ts` and `src/app/groups/[slug]/edit/actions.ts`. `src/app/profile/actions.ts` was also switched to the shared helper, replacing its inline regex check. (This helper was later folded into the `url` field type of `readFormFields()` under TD-M11, and `src/lib/url.ts` was deleted.)

### TD-M4 — ~~Substantial duplicated logic~~ ✅ Fixed

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

**Resolution**

1. `src/lib/datetime.ts` now holds `londonToUTC` alongside `utcToLondonDatetimeLocal` (moved out of `src/lib/utils.ts`); `londonToUTC` reuses `utcToLondonDatetimeLocal` for the Europe/London formatting.
2. `src/lib/slug.ts` exports `slugify`, used by both group create and edit actions.
3. `src/lib/forms.ts` exports `FormState`, `extractFields` and `fail`. `CreateEventState`, `EditEventState` and `EditGroupState` are now aliases of `FormState`.
4. `src/lib/uploads.ts` exports `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES` and `validateImageUpload(file, label)`, used by event photo, group logo (create/edit) and avatar uploads.
5. `src/app/dashboard/page.tsx` imports `GROUP_TYPE_LABELS` from `src/lib/constants.ts`. Dashboard group cards now show "Community group" rather than "Community", matching the rest of the app.

### TD-M5 — ~~Inconsistent Server Action error contracts~~ ✅ Fixed

**Location:** All `actions.ts` files

Three patterns coexist:

1. `{ error: string | null }` — `src/app/events/actions.ts`, `src/app/groups/actions.ts`
2. `redirect("/path?error=...")` — `src/app/groups/create/actions.ts`, `src/app/events/[id]/stats/actions.ts`
3. `{ error, fields }` state object — `src/app/events/[id]/edit/actions.ts`, `src/app/groups/[slug]/edit/actions.ts`

Several paths also return raw `error.message` from Postgres straight to the client, leaking internal detail.

**Suggested fix**

Standardise on the `{ error, fields }` state-object contract with `useActionState`. Never return `error.message` directly — map known codes (`23505`, `P0001`) to user-facing strings and fall back to a generic message.

**Resolution**

1. Form-backed actions now all use the `FormState` contract from `src/lib/forms.ts` with `useActionState`, and `redirect()` only on auth gates and success:
   - `createGroup` (`src/app/groups/create/actions.ts`) — the form moved into a new `CreateGroupForm.tsx` client component; the page no longer reads `?error=`.
   - `submitStats` (`src/app/events/[id]/stats/actions.ts`) — the form moved into a new `StatsForm.tsx`. A local `fail()` re-adds the `litter_types` checkbox group, which `extractFields` would otherwise collapse to one value. The unrendered `?error=Not+authorised` redirect is now an inline error.
   - `submitOrganiserApplication` (`src/app/become-a-verified-organiser/actions.ts`) — `ApplicationForm.tsx` is now a client component using `useActionState`.
2. Submitted values are now kept after a validation error on all three forms, where the redirect pattern used to clear them.
3. Raw Postgres `error.message` is no longer returned from `joinEvent`, `leaveEvent`, `cancelEvent`, `joinGroup`, `leaveGroup`, or `updateEvent`. Known codes (`23505`, `P0001 event_full`) keep their specific messages, everything else falls back to a generic "Failed to … Please try again.", and the raw error is logged server-side with `console.error`.
4. Button-triggered actions (`joinEvent`, `cancelEvent`, admin approve/reject, etc.) keep returning `{ error: string | null }`, which matches `FormState` without `fields`.

**Out of scope:** `src/app/(auth)/actions.ts` still uses `redirect("/sign-in?error=...")` and passes through Supabase Auth (GoTrue) messages. These are intended for end users (e.g. "Invalid login credentials"), and the sign-in page's resend-confirmation flow depends on them, so converting auth is left as a separate change. (Listed in the watch list.)

### TD-M6 — In-process email rate limiter leaks memory and is ineffective in serverless — Open (action A4)

**Location:** `src/lib/email.ts`

```ts
const emailRateLimitMap = new Map<string, number>();
```

Entries are never evicted — unbounded growth on long-lived instances. The map is also per-instance, so it provides no real protection across serverless invocations, which is the actual deployment model.

**Suggested fix**

Move the cooldown to the database alongside the existing helpers in `src/lib/ratelimit.ts`. If the in-process map is kept as a cheap first line of defence, add TTL eviction.

### TD-M7 — ~~`/api/reverse-geocode` is an unauthenticated open proxy~~ ✅ Fixed

**Location:** `src/app/api/reverse-geocode/route.ts`

Coordinates are validated correctly, but the route has no auth and no rate limit. It can be driven at volume to proxy traffic to postcodes.io under your IP and reputation.

**Resolution**

Both routes stay public so anonymous location search keeps working. They now have a per-IP rate limit instead of requiring a session.

1. `supabase/migrations/0035_api_rate_limits.sql` adds an `api_rate_limits` table and an atomic fixed-window `consume_rate_limit(key, limit, window_seconds)` function. RLS is on with no policies, and `EXECUTE` is granted only to `service_role`. A pg_cron job clears expired rows hourly. Keys are `<route>:<sha256(ip)>`, so raw IPs are never stored.
2. `consumeGeocodeRateLimit()` in `src/lib/ratelimit.ts` takes the client IP from the first `x-forwarded-for` entry (Vercel overwrites this header), falling back to `x-real-ip`. It allows **30 lookups per IP per minute, per route**, and fails open with logging if the database call errors.
3. `/api/reverse-geocode` and `/api/geocode` both check the limit after input validation, so malformed requests are rejected without using any quota. Over the limit, they return `429` with a `Retry-After` header and a user-facing `error` message, which the existing `src/lib/geolocation.ts` wrappers already display. Coordinate and postcode validation and the postcodes.io fetch caching are unchanged.

### TD-M8 — ~~Group membership changes do not revalidate the discovery page~~ ✅ Fixed

**Location:** `src/app/groups/actions.ts`

`joinGroup` and `leaveGroup` call `revalidatePath("/groups/" + slug)` only. But `/groups` sorts cards by member count and derives the featured-group score from recent joins, and `/dashboard` lists memberships. Both go stale immediately.

**Resolution**

`joinGroup` and `leaveGroup` now also call `revalidatePath("/groups")` and `revalidatePath("/dashboard")`. The review also found that `/profile/[id]` lists a user's group memberships, so both actions call `revalidatePath("/profile/[id]", "page")` too. That revalidates the route pattern because profiles can be reached by UUID or by username.

### TD-M9 — Hand-written database types drift from the schema — Open (action A2, merged with SEO-H5 and SEO-H8)

**Location:** `src/types/database.ts`

385 lines maintained by hand with no generation step when first audited. The cost is already visible in `src/lib/events.ts`:

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

**Evidence from the SEO work:** the `events_with_counts` view lacked `location_outcode` and `location_admin_district` while this file already declared them, so nothing flagged the gap until migration `0038` (SEO-H5). Migration `0037` also needed `group_slug_history` added by hand (SEO-H8).

### TD-M10 — ~~`getPublishedGroups()` is a full-table scan aggregated in JavaScript~~ ✅ Fixed

**Location:** `src/lib/events.ts`

Every `/groups` request reads all groups, all `group_members`, and all group-linked events, then builds member counts, upcoming-event counts, and a weighted activity score in memory. The code acknowledges this:

> Counts are computed client-side since there's no `groups_with_counts` view yet.

**Resolution**

Added the `groups_with_counts` view in `supabase/migrations/0033_impact_and_group_aggregation_views.sql`, mirroring the `events_with_counts` pattern with `security_invoker = true`. `getPublishedGroups()` in `src/lib/events.ts` now does a single `select("*")` against the view instead of three unbounded table reads reduced in JavaScript, resolving the truncation risk noted in TD-H2 as well.

### TD-M11 — ~~`sanitizeText` is naive and applied inconsistently~~ ✅ Fixed

**Location:** `src/lib/sanitize.ts`, `src/app/groups/create/actions.ts`

```ts
return input.replace(/<[^>]*>/g, "").trim();
```

Mishandles unclosed tags and `>` characters inside attribute values. More significantly, application is uneven — `groups/create/actions.ts` sanitizes `postcode` and `location_name` but leaves `name`, `description`, and `contact_email` raw.

**Suggested fix**

Apply `sanitizeText` uniformly to all free-text fields, or drop it in favour of a well-tested library. Document the policy so new fields are not missed.

**Resolution**

The review found the tag-stripping was the wrong defence as well as uneven. LitterLink never accepts HTML, so user text is now stored as plain text and escaped at output. Input is validated by field type.

- **Real XSS sink fixed.** `EventsMap` and `GroupsMap` built Leaflet popups by interpolating `event.title`, `address_label`, `group.name` and `location_name` into raw HTML. `sanitizeText` did not protect this: an unclosed tag such as `<img src=x onerror=alert(1)//` passes the regex, and group names on create were never sanitized. Both maps now use `escapeHtml()` from the new `src/lib/html.ts`. This also covers any rows already in the database.
- **Stripping removed.** `src/lib/sanitize.ts` is deleted. Stripping `<…>` also damaged real text like "kids < 10 > adults".
- **Field-type policy.** `readFormFields(formData, schema)` in the new `src/lib/input.ts` is now the only way actions read free-text fields. Each field declares `text`, `multiline`, `email`, `url` or `postcode`, and `text`/`multiline` must set a `max`. The helper normalises the value (NFC, removes control and bidi-override characters, handles whitespace per type), then checks required, length and format, and returns the first error.
- **Applied everywhere.** Every free-text field in event create/edit, group create/edit, profile, stats, organiser application and sign-up `display_name` now goes through it. Several caps that were only enforced client-side are now also checked on the server: group name/description, display name, application fields, URLs. Group `contact_email` is now format-checked.
- **Consolidated.** `validateHttpUrl` (`src/lib/url.ts`) is folded into the `url` field type and the file is deleted.
- **Documented.** The policy is written up under "Input handling" in `AGENTS.md`: which field types exist, what enums/numbers/identifiers and passwords do instead, and the output-escaping rule for raw-HTML sinks.

---

### TD-L1 — ~~`impact/page.tsx` is 849 lines mixing three concerns~~ ✅ Fixed

Data fetching, aggregation, and presentation in a single file. Extract `getImpactData` and the period helpers into `src/lib/impact.ts`.

**Resolution**

`src/lib/impact.ts` (`import "server-only"`) now holds the `Period` type, `isPeriod`, `getPeriodOptions`, `getPeriodDescription`, the private `getPeriodRange`, and `getImpactData`, moved verbatim. `src/app/impact/page.tsx` is down to presentation only (~525 lines) and imports them. No behaviour change; `npx tsc --noEmit` and `npm run lint` pass clean.

### TD-L2 — ~~Proxy route protection does not match the documentation~~ ✅ Fixed

`src/lib/supabase/middleware.ts` guards only `/dashboard`, `/events/create`, and `/profile`. The docs in `AGENTS.md` and `docs/context/routes-and-features.md` also claim `/events/[id]/edit`. Page-level checks do cover it, so this is a documentation accuracy issue rather than a security hole — but the two should agree.

**Resolution**

The review found that only `docs/context/routes-and-features.md` made the claim. `AGENTS.md` does not list proxy-protected routes. Every protected page (`/dashboard`, `/profile`, `/events/create`, `/events/[id]/edit`, `/events/[id]/stats`, `/become-a-verified-organiser`, `/groups/create`, `/groups/[slug]/edit`) already does its own `getUser()` check and redirects to `/sign-in?redirectTo=…`. So the docs were changed to match the code, and the proxy was left as it is.

1. The "Route Protection Logic" section in `docs/context/routes-and-features.md` now lists the proxy's real prefixes, including the `/profile/[id]` sign-in message. It states that the page-level check is authoritative, names the routes that rely on it alone, and says new protected pages must include it.
2. `docs/context/tech-stack.md` no longer says route protection is "enforced in `src/proxy.ts`". It now describes the page-level check as primary and the proxy as an early redirect.

### TD-L3 — ~~No `loading.tsx` anywhere~~ ✅ Fixed

No streaming or skeleton states on data-heavy routes. `/impact` in particular runs nine parallel queries before rendering anything.

**Resolution**

`loading.tsx` skeletons were added to the four routes that do heavy data work with nothing to show until it finishes. The layout router keys segments without search params, so a period, filter or page change keeps the current content visible rather than showing the skeleton again.

1. `/impact` — `src/app/impact/loading.tsx`. The static hero is extracted into `ImpactHero.tsx` and shared by the page and the skeleton, so it appears immediately and doesn't shift when the data arrives.
2. `/dashboard` — `src/app/dashboard/loading.tsx`, covering its five sequential per-user queries.
3. `/events` and `/groups` — the list pages moved into `(browse)` route groups (`src/app/events/(browse)/`, `src/app/groups/(browse)/`), each with its own `loading.tsx`; URLs are unchanged. A `loading.tsx` directly in `events/` or `groups/` would also wrap `[id]`, `[slug]`, `create` and `edit`, which would then show a list skeleton, and detail-page `notFound()` would become a soft 404.
4. The filter skeleton that both list pages defined separately is now `src/components/FilterSkeleton.tsx`, used by the pages' `<Suspense>` fallbacks and the loading files.

**Deliberately not added:** `/events/[id]`, `/groups/[slug]` and `/profile/[id]`. They call `notFound()` after fetching. Once a loading fallback has streamed, the HTTP status is already sent as `200`, so missing records would return a soft 404 (`200` + `noindex`) instead of a real `404`. Form pages (`create`/`edit`/`stats`, `/profile`) and `/admin` only run light owner or auth lookups.

### TD-L4 — ~~Dead schema columns~~ ✅ Fixed

`weight_kg` and `area_covered_sqm` exist on `event_stats` and in `src/types/database.ts` with no UI in any form. Either build the inputs or drop the columns.

**Resolution**

The columns were dropped.

1. Added `supabase/migrations/0036_drop_event_stats_weight_area.sql`, dropping `weight_kg` and `area_covered_sqm` (and their CHECK constraints) from `event_stats`. No view referenced either column.
2. Removed both fields from the `event_stats` Row/Insert/Update types in `src/types/database.ts`.
3. Removed the read-only `kg`/`m²` stat tiles from `src/app/events/[id]/page.tsx` and `src/components/events/LatestEventHighlight.tsx`. They could only ever render for values set outside the app.

### TD-L5 — ~~Unreachable UI option remains reachable by URL~~ ✅ Fixed

The `year` period was commented out of `getPeriodOptions()`, but `isPeriod` still accepted it and `getPeriodRange` still handled it, so `?orgPeriod=year` worked.

**Resolution**

Removed `year` from the `Period` union, `PERIOD_VALUES`, `getPeriodRange`, `getPeriodDescription` and the commented-out option in `src/lib/impact.ts`. `?orgPeriod=year` now falls back to the default period.

### TD-L6 — No CI, no dependency audit, no typecheck script ⚠️ Partly fixed (CI + `typecheck` added under TD-H5; no `audit` script — action A6)

`package.json` defined only `dev`, `build`, `start`, and `lint`. The suggested additions were:

```json
"typecheck": "tsc --noEmit",
"audit": "npm audit --audit-level=high"
```

and a GitHub Actions workflow running lint, typecheck, and tests on every push. The workflow and `typecheck` now exist. The `audit` script does not (checked 23 November 2026).

### TD-L7 — ~~One-off backfill script committed with no provenance~~ ✅ Fixed

`scripts/backfill-event-locations.mjs` had no record of whether it had been run.

**Resolution**

The script has been run, so it was moved to `scripts/archive/backfill-event-locations.mjs`. Its header now says it is archived, and its usage paths point at the new location.

### TD-L8 — ~~Client-side pagination~~ ✅ Fixed

`/events` and `/groups` both fetch the full result set then `.slice()`. Combined with TD-H2, this means the page size is a display concern layered over an already-truncated dataset.

**Resolution**

The review found the in-memory slicing is intentional, and the truncation it described was already fixed by TD-H2. The slicing runs in the Server Component, not the browser, and the map on each page needs the full result set anyway (`EventsMap` gets every event in the date range, `GroupsMap` every group of the selected type). Paginating in SQL would not reduce the fetch, and the radius filter would need PostGIS or an RPC. The review did find related gaps, which are now fixed:

1. **Unbounded date range.** `?from=2020-01-01&to=2099-12-31` made `/events` page through every event and send them all to the map. `parseEventDateRange()` in the new `src/lib/search-params.ts` now accepts only real `YYYY-MM-DD` dates, falling back to today and today + 7 days. It swaps a reversed range and limits the span to 365 days, so a full year (e.g. 1 January 2026 to 1 January 2027) can still be searched. `?from=` without `to` now means `from` + 7 days, rather than today + 7 days, which could fall before `from`.
   - When a range is shortened, the page shows a notice saying searches can cover up to 365 days and which dates are being shown.
   - `EventsFilter` stops out-of-range dates being picked. The "To" input's `min`/`max` follow the "From" date, so the date picker greys out anything outside the 365 days. A typed date outside it fails browser validation before submit. If changing "From" leaves "To" out of range, "To" is moved when the field loses focus, with a message under it explaining why.
   - The filter is keyed on the normalised range, so its inputs always show the dates the results use.
2. **`getPublishedGroups()` had no `.range()` loop**, so groups past 1000 would be silently dropped. This was missed in TD-H2. It now paginates like `getPublishedEvents`.
3. **Unstable paging order.** `getPublishedEvents`, `getEventsByGroupId` and `getPublishedGroups` now also order by `id`. Without a tiebreaker, rows with the same `starts_at`/`created_at` could be duplicated or skipped across 1000-row pages.
4. **Malformed `page`/`radius`.** `?page=abc` gave `NaN` and an empty list, and `?radius=abc` filtered out every result. `parsePage()` now falls back to page 1, and `parseRadiusKm()` only accepts the values the filters offer, otherwise the 16 km default. `RADIUS_OPTIONS` and `DEFAULT_RADIUS_KM` moved to `src/lib/constants.ts` and are shared by both filters and the server. Pagination links carry the normalised values.

Covered by `src/lib/search-params.test.ts`.

### TD-L9 — ~~Batched photo uploads exceed the hosting platform's request body limit~~ ✅ Fixed (production check outstanding — action A7)

**Location:** `next.config.ts`, `src/components/events/PhotoUpload.tsx`, `src/app/events/actions.ts` (`uploadEventPhoto`), `src/lib/uploads.ts`

`next.config.ts` set `bodySizeLimit: "11mb"`. This was sized for `uploadEventPhoto`, which received every selected photo in one request: up to 10 photos, each compressed client-side to about 1 MB WebP (`maxSizeMB: 1`), so about 10 MB per full batch. The 5 MB `MAX_IMAGE_BYTES` in `src/lib/uploads.ts` is a per-file backstop, not a per-request cap, so tightening `bodySizeLimit` to `6mb` would have rejected legitimate batches of about 6 or more photos. Logo and avatar uploads are compressed to 0.25 MB and are unaffected either way.

The `11mb` setting was never reached in production. Vercel caps a function's request body at 4.5 MB whatever `bodySizeLimit` says, so:

- A batch of more than about 4 photos near the 1 MB target was likely to be rejected by the platform with `413` before the action ran.
- Lowering `bodySizeLimit` on its own would change nothing in production and only break batches locally.

**Suggested fix**

1. Have `PhotoUpload` send photos one per request, or in batches kept under about 4 MB. Collect `uploaded`/`failed` results on the client as it does now.
2. Enforce the 10-photo limit per request in `uploadEventPhoto`. It already re-counts existing photos, so sequential single-photo requests stay correct.
3. Then lower `bodySizeLimit` to about `2mb`, and lower `MAX_IMAGE_BYTES` towards the 1 MB compression target, keeping some headroom for files that `browser-image-compression` can't get under the target.

**Resolution**

1. `PhotoUpload` now compresses and uploads each photo in its own `uploadEventPhoto` request, one after another. Per-photo failures are collected and shown together as before, and successfully uploaded photos are removed from the selection at the end. If a request fails for a reason that applies to the whole batch (not signed in, event not completed, photo limit reached), the loop stops rather than repeating the same error. The button now reads "Uploading N of M…".
2. `uploadEventPhoto` is unchanged. It re-counts existing photos on every request, so the 10-photo limit still holds across sequential single-photo requests.
3. `bodySizeLimit` in `next.config.ts` is now `2mb`, and `MAX_IMAGE_BYTES` in `src/lib/uploads.ts` is now 1.5 MB. Logo and avatar uploads (0.25 MB target) never submit the uncompressed original, so they fit well within both limits.

`npx tsc --noEmit` and `npm run lint` pass clean. The upload flow still needs a production check with 6 or more photos.

---

## Part B — SEO findings

### Critical before launch

#### SEO-C1 — ~~Auth pages could be indexed and reflected text from the URL~~ ✅ Fixed (W1)

**Location:** `src/app/(auth)/*`, `src/app/page.tsx`

`/sign-in` printed `?error=` and `?message=` on the page, and the homepage forwarded `?error_description=` to it. None of the four auth pages had metadata or `noindex`. Anyone could have got arbitrary text indexed on the domain.

**Resolution:**
- New `src/app/(auth)/layout.tsx` sets `robots: NOINDEX_FOLLOW`. The pages stay crawlable so search engines can see the directive.
- Each auth page now has a distinct title: "Sign in", "Sign up", "Forgot password" and "Reset password".

#### SEO-C2 — ~~The postcode filter echoed arbitrary text, with no noindex or canonical~~ ✅ Fixed (W1/W3)

**Location:** `src/app/events/(browse)/page.tsx`, `src/app/groups/(browse)/page.tsx`

The raw `?postcode=` value was printed next to the H1 and in a "wasn't recognised" notice.

**Resolution:**
- New `parsePostcode()` in `src/lib/search-params.ts` only accepts trimmed values of 10 characters or fewer that match `UK_POSTCODE_PATTERN`, returned upper-cased. Tests are included.
- Invalid input shows a generic "That postcode wasn't recognised." and is left out of pagination links.
- Filtered variants are `noindex, follow` (see SEO-C4).

**Residual:** the raw value still appears in Next's router (RSC) payload and in the filter input's `value` attribute. It is not visible on-page text, and the URL is `noindex`.

#### SEO-C3 — ~~Every page inherited the homepage's Open Graph URL and title~~ ✅ Fixed (W2)

**Location:** `src/app/layout.tsx`

The root layout set `openGraph.url: "/"` and a homepage `og:title`. Next.js merges metadata shallowly, so every page without its own `openGraph` claimed to be the homepage when shared.

**Resolution:**
- The root layout now sets only `siteName`, `type` and `locale: "en_GB"` (`OPEN_GRAPH_DEFAULTS`).
- Every public page sets its own `og:title`, `og:description` and `og:url` through `pageMetadata()`.

#### SEO-C4 — ~~No canonical URLs; event links added a `?back=` parameter~~ ✅ Fixed (W3)

**Location:** `src/components/events/EventCard.tsx`, all public pages

Nothing set `alternates.canonical`. Event cards on filtered `/events` pages link to `/events/{id}?back=…`, so a single event had many URLs.

**Resolution:**
- These pages now have canonicals: `/`, `/events`, `/groups`, `/impact`, `/events/{id}`, `/groups/{slug}`, `/privacy` and `/terms`.
- Filtered and paginated listing variants get `noindex, follow` *without* a canonical, because Google advises against combining the two. Unrelated parameters such as `?flash=` and `utm_*` keep the canonical.
- Event card links no longer add `?back=` (W7), so each event has one URL. The "All events" link on the event page always goes to `/events`; the browser Back button still restores the filtered list.

#### SEO-C5 — ~~Coming-soon mode only partly hid the site~~ ✅ Removed

**Location:** `src/proxy.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/coming-soon/page.tsx`

Only `/`, `/events` and `/events/*` redirected. Groups, impact, auth and legal pages stayed indexable, and the sitemap kept listing URLs that redirected.

**Resolution:** the site has launched, so coming-soon mode has been removed entirely:
- The `/coming-soon` route is deleted (it now returns 404; it was always `noindex`, so nothing indexed is lost).
- `isComingSoon()` and the `COMING_SOON` flag are gone, and the variable has been removed from the hosting provider.
- The proxy no longer redirects or adds `X-Robots-Tag`.
- `sitemap.ts` always lists URLs and `robots.ts` always includes the `Sitemap:` line.

---

### High priority

#### SEO-H1 — ~~Private routes had no noindex~~ ✅ Fixed (W1)

**Location:** dashboard, profile, admin, create/edit/stats pages, become-a-verified-organiser

These routes relied only on auth redirects.

**Resolution:**
- New `dashboard/layout.tsx` and `profile/layout.tsx`, plus a metadata export on `admin/layout.tsx`, set `robots: NOINDEX` (`index: false, follow: false`).
- Per-page `robots: NOINDEX` on:
  - `events/create`
  - `events/[id]/edit`
  - `events/[id]/stats`
  - `groups/create`
  - `groups/[slug]/edit`
  - `become-a-verified-organiser`

#### SEO-H2 — ~~`robots.txt` blocks the wrong things~~ ✅ Fixed (W5)

**Location:** `src/app/robots.ts`, `src/lib/supabase/middleware.ts`, public pages that link to profiles

`/profile` was disallowed even though public event, group and impact pages link heavily to `/profile/*`. Blocked URLs that are well linked can be indexed as bare URLs, and a blocked URL's `noindex` is never seen. `/api/` was not disallowed.

**Fix:**
- `robots.ts` disallows `/api/` and no longer disallows `/profile`.
- The proxy sends `X-Robots-Tag: noindex, nofollow` on every `/profile` response. That includes the 307 that anonymous visitors (and crawlers) receive, so the noindex is on the profile URL itself, not only on the sign-in page it redirects to. Signed-in responses also keep the `NOINDEX` metadata from `profile/layout.tsx`.
- Profile links on public pages (`events/[id]` organiser and attendees, `groups/[slug]` members, `impact` top organisers) have `rel="nofollow"`.
- Rule to keep: never disallow a route that relies on `noindex`.

#### SEO-H3 — ~~The sitemap is incomplete and truncates at 1,000 events~~ ✅ Fixed (W5)

**Location:** `src/app/sitemap.ts`, `src/lib/sitemap.ts`, `src/lib/events.ts`, `src/lib/legal.ts`

The sitemap listed only `/`, `/events` and events. It used one unpaginated query, so PostgREST cut it off at 1,000 rows. It stamped `new Date()` on static pages and dated events from `updated_at`, which the trigger also bumps on system-only writes (stats-reminder and reschedule bookkeeping). This is the same 1,000-row failure mode as TD-H2.

**Resolution:**
- **Coverage:** `/`, `/events`, `/groups`, `/impact`, `/privacy`, `/terms`, every listed event and every `/groups/{slug}`. Group slugs are URL-encoded. These are exactly the pages that have a canonical.
- **Pagination:** `getSitemapData()` in `src/lib/events.ts` reads events, `event_stats` and groups in 1,000-row `.range()` pages ordered by a unique key. Unlike the older list helpers, it throws on a query error. A failed query returns a 500, which crawlers retry, instead of a truncated sitemap.
- **`lastModified` only where it reflects a real change:**

  | Entry | `lastModified` |
  |---|---|
  | `/events/{id}` | Latest of `created_at`, `content_updated_at` (organiser edits) and the event's `event_stats.updated_at`. `updated_at` is deliberately ignored |
  | `/events` | Latest of the listed events |
  | `/` and `/impact` | Latest `event_stats.updated_at`, since both show stats totals |
  | `/privacy`, `/terms` | The page's "Last updated" date. Both now come from `src/lib/legal.ts`, so the page and the sitemap can't drift |
  | `/groups`, `/groups/{slug}` | Omitted: groups have no edit timestamp, and Google prefers no `lastmod` to a wrong one |

- `changeFrequency` and `priority` were removed. Google ignores both, and the old values (`weekly` for finished events) were misleading.
- **Stale events:** published events that started more than 14 days ago (`STALE_EVENT_GRACE_DAYS`) were never wrapped up, so they are left out. Completed events stay listed. Drafts and cancelled events stay excluded. Organisers get the stats reminder 12 hours after the start, so 14 days leaves plenty of time to wrap up before an event drops out. The event page itself is `noindex` under the same rule (see SEO-M4).
- **Scale:** a single sitemap holds up to 50,000 URLs (`SITEMAP_URL_LIMIT`). The route logs a warning if it goes over. At that point, split it with `generateSitemaps()`. In Next 16 that serves `/sitemap/{id}.xml` with no automatic index, so `robots.ts` would need to list each file. (Watch list.)
- The route still renders per request because the Supabase server client reads cookies. That avoids a database dependency at build time and keeps it fresh.
- Unit tests (`src/lib/sitemap.test.ts`) cover coverage, stale-event rules, `lastModified` derivation and the empty-data case.

#### SEO-H4 — ~~Weak, generic or doubled titles~~ ✅ Fixed (W2)

| Page | Before | After |
|---|---|---|
| `/` | LitterLink | LitterLink — Find Local Litter Picks Near You (absolute) |
| `/events` | Browse Events | Litter Picking Events Near You |
| `/groups` | Browse Groups | Litter Picking Groups Near You |
| `/impact` | Impact | UK Litter Picking Impact |
| `/terms` | Terms & Conditions — LitterLink \| LitterLink | Terms & Conditions \| LitterLink |
| `/profile` | Your Profile — LitterLink \| LitterLink | Your Profile \| LitterLink |
| `/profile/[id]` | {name} — LitterLink \| LitterLink | {name} \| LitterLink |

#### SEO-H5 — ~~Event and group metadata incomplete~~ ✅ Fixed (W2/W4)

**Location:** `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx`

**Done:**
- Event titles are now `{title} – {district}, {Sat 12 Oct 2026}`.
- Group titles are now `{name} – Litter Picking Group`.
- Descriptions go through `metaDescription()`, which collapses whitespace and cuts on a word boundary at about 155 characters. Fallbacks are more informative.
- Both pages have a canonical and full Open Graph URL, title and description.
- Event and group pages have generated share images (see SEO-H6).
- `getEventById` and `getGroupBySlug` are wrapped in React `cache()`, so `generateMetadata` and the page share one query per request.
  - The share image is a separate HTTP request, so it still runs its own query.

**Done — event place name (16 October 2026):**
- **Cause (found during W4):** `events_with_counts` lists its columns explicitly (migration `0024`) and was never rebuilt after `0031` added `location_outcode` and `location_admin_district`.
  - As a result, `{district}` in event titles always fell back to the postcode, even though the TypeScript type includes both fields. **This is the hand-written-types drift described in TD-M9 (action A2).**
- **Migration `0038_events_with_counts_location_display.sql`** adds both columns to the view. It has been applied.
  - It uses `CREATE OR REPLACE VIEW` rather than `DROP` + `CREATE`, so the view is never missing and its grants and `security_invoker = true` are kept. The existing columns are unchanged and the two new ones are appended at the end, as Postgres requires.
  - Checked in PGlite (Postgres compiled to WASM): applied on top of `0024` + `0031`, re-run cleanly, kept `security_invoker=true` and the `anon`/`authenticated` `SELECT` grants, and returned both fields.
  - No app change is needed to read the fields: the view-backed `EventWithCount` type already includes them through `EventRow`.
- **`districtName()`** in `src/lib/seo.ts` turns the inverted ONS names that postcodes.io returns for some areas into readable ones: "Bristol, City of" → "Bristol", "Kingston upon Hull, City of" → "Kingston upon Hull", "Herefordshire, County of" → "Herefordshire". Other names, such as "City of Edinburgh", are left as they are.
  - Without it, a title would read "Park tidy – Bristol, City of, Sat 24 Oct 2026".
  - Event titles now use `districtName(location_admin_district) ?? location_outcode ?? location_postcode`.
- **Event share card:** the pin line shows the meeting point followed by the district, unless the meeting point already names it.
  - "Sanders Park" → "Sanders Park, Bromsgrove"
  - "B61 7DR" (no address label) → "B61 7DR, Bromsgrove"
  - "Sanders Park, Bromsgrove" is left as is.
  - postcodes.io only gives a district, not a county, so the card shows "Bromsgrove" rather than "Bromsgrove, Worcestershire".
- Unit tests cover `districtName()` and the share-card place line.
- The impact page's "Top areas" (`src/lib/impact.ts`) also groups and labels by `districtName()`, so it shows "Bristol" rather than "Bristol, City of".

#### SEO-H6 — ~~No share images or X card metadata~~ ✅ Fixed (W4)

**Location:** `src/app/layout.tsx`, `src/lib/seo.ts`, `src/app/opengraph-image.png`

**Done:**
- Added `src/app/opengraph-image.png` (1200×630 PNG, 1.1 MB). This is under the 5 MB limit for X and the 8 MB limit for Facebook. It is served as a static route at `/opengraph-image.png`.
- Added `DEFAULT_SHARE_IMAGE` to `src/lib/seo.ts`. It holds the URL, 1200×630 size, `image/png` type and alt text, and is set as `images` in `OPEN_GRAPH_DEFAULTS`.
  - Why: Next.js only attaches a root `opengraph-image.*` file to the root segment. Every page that calls `pageMetadata()` sets its own `openGraph`, which replaces the whole object and would drop a file-only image. Keeping the image in the shared defaults gives every page `og:image`, whether it sets its own `openGraph` or inherits the root one.
- Added `TWITTER_DEFAULTS` (`card: "summary_large_image"`, `site: "@litterlink_"`) to the root layout as `twitter`.
  - No `twitter-image.*` file and no `twitter.images` are set, so Next fills `twitter:image`, `twitter:title` and `twitter:description` from each page's Open Graph values. X therefore shows the same image as Open Graph.
- Added a `seo.test.ts` case that checks `pageMetadata()` keeps the default share image.

**Done — generated event images (15 October 2026):**
- `src/app/events/[id]/opengraph-image.tsx` awaits `params`, loads the event with `getEventById()`, and renders a 1200×630 PNG with `ImageResponse`.
  - Unknown events, and events hidden by RLS, return 404, matching the page.
- The card is a fixed branded template, with no user-uploaded photos, so it renders predictably and can't misrepresent the event. It shows:
  - the real logo (`public/LitterLink_logo-horizontal.png`, embedded as a data URI)
  - a status badge
  - the title
  - the meeting point (`address_label ?? location_postcode`)
  - the London date and time range, e.g. "Saturday 24 October, 10:00–12:00", with the year added outside the current year (a comma, not "·", because the bundled Geist subset has no middle-dot glyph)
  - "Hosted by {group or organiser}"
  - `litterlink.co.uk`
  - Participant count is deliberately left out because it changes often.
- **Status badges:**
  - "Upcoming litter pick" (green)
  - "Past litter pick" (grey)
  - "Completed litter pick" (grey)
  - "Event cancelled" (red)
  - "Draft event" (amber)
  - Past, completed and cancelled events therefore don't look like invitations.
  - Cancelled events are publicly readable (migration `0039`), so crawlers and anyone with the link get the page and the red "Event cancelled" card. RLS still hides drafts from everyone except the organiser, so crawlers get a 404 for those.
- **Long text:**
  - Titles step down from 80 px to 46 px as they get longer, are capped at 100 characters on a word boundary, and are limited to 4 lines.
  - The meeting point and host are each limited to one line with an ellipsis.
  - Checked visually with a 119-character title and very long meeting-point and group names.
- **Code layout:**
  - Content rules (`fitShareTitle`, `formatShareDate`, `eventShareCard`) are in `src/lib/share-image.ts`, with unit tests.
  - The Satori template (`renderShareImage`) is in the server-only `src/lib/share-image-render.tsx`, ready to reuse for groups.
  - Geist Regular and Bold TTFs, under the SIL OFL licence, are in `src/assets/fonts/`. `next/og` only bundles a regular weight, and Satori can't fake bold.
- `pageMetadata()` has a new `defaultImage: false` option, which the event page uses, so Next applies the generated file image to both `og:image` and `twitter:image`.
- **Caching:** the image response keeps `ImageResponse`'s default `Cache-Control: public, max-age=0, must-revalidate`, so a cancelled or edited event isn't served a stale card.
  - The `?<hash>` in the image URL Next generates is a build hash, not the event content. Platforms that cache by URL (Facebook, X, LinkedIn) need a re-scrape after major edits. (Watch list.)

**Done — background photo and gradient (16 October 2026):**
- Both generated cards sit on a stock litter-picking photo (`public/images/litter-picking-background.jpg`, embedded as a data URI and drawn with `objectFit: "cover"`).
- A full-bleed overlay uses a CSS `linear-gradient(90deg, …)` that is solid white up to 45%, then fades to fully transparent by 90%. The text column stays on plain white for contrast, and the photo shows through on the right.
- The domain pill has a translucent white background so it stays readable over the photo.
- Cost: each PNG is now about 940–950 KB (previously about 90 KB), which is still well under the 5 MB X and 8 MB Facebook limits. Rendering takes about 0.9–1.4 s locally.

**Done — generated group images (16 October 2026):**
- `src/app/groups/[slug]/opengraph-image.tsx` awaits `params`, loads the group with `getGroupBySlug()`, and renders through the same `renderShareImage()` template.
  - Unknown slugs return 404. Old slugs also return 404 for the image, but the page itself 308-redirects to the current slug, whose metadata points at the current image.
- `groupShareCard()` in `src/lib/share-image.ts` builds the content:
  - a "Litter picking group" badge (green)
  - the group name as the title, with the same sizing, 100-character cap and 4-line limit as event titles
  - the location (`location_name || location_postcode`), limited to 70 characters and one line, and left out when the group has no location
  - the group type from `GROUP_TYPE_LABELS` (e.g. "Community group", "Charity"), with "Organisation" for unknown types
  - no footer host line
  - Member and upcoming-event counts are deliberately left out because they change often and platforms cache the card.
  - Group logos are not shown. They are user uploads stored as WebP, which Satori can't render, and they could look wrong at this size.
- The group page passes `defaultImage: false` to `pageMetadata()`, so `og:image` and `twitter:image` point at the generated image.
- `getGroupBySlug` is now wrapped in React `cache()` (see SEO-H5).
- `share-image.test.ts` covers the full card, the postcode fallback, the missing-location case, the unknown-type fallback and long location names.
- Checked visually with a short name ("Batchwood Pickers") and a 63-character, three-line name.

#### SEO-H7 — ~~No structured data~~ ✅ Fixed (W6)

**Location:** `src/lib/structured-data.ts`, `src/components/JsonLd.tsx`, `src/lib/html.ts`, `src/app/page.tsx`, `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx`

**Resolution:** each page renders one `<script type="application/ld+json">` holding an `@graph`. Nodes are linked by `@id`.
- **Homepage:** `Organization` (`@id` `/#organization`; square 512×512 logo; `email`; `sameAs` Facebook, Instagram and X) and `WebSite` (`inLanguage: en-GB`, `publisher` → the organisation). No `SearchAction`: Google retired the sitelinks search box in November 2024. The social URLs and contact email now live in `SOCIAL_PROFILES` / `CONTACT_EMAIL` in `@/lib/seo`, and the footer uses the same constants, so `sameAs` can't drift from the footer.
- **Event pages:** `Event` with:
  - `startDate`, plus `endDate` when it's after the start
  - `eventStatus`: `EventCancelled` for cancelled events, otherwise `EventScheduled`. `EventRescheduled` isn't used because it needs `previousStartDate`, which isn't stored.
  - `eventAttendanceMode: OfflineEventAttendanceMode`
  - `location` as a `Place` (meeting point name, or the postcode) with a `PostalAddress` (postcode, `districtName()` locality, `GB`) and `geo` (the exact meeting point)
  - `organizer`: the group as an `Organization` whose `@id` matches the group page, otherwise the organiser as a `Person` with no URL, since profiles are `nofollow`
  - `isAccessibleForFree: true` and `maximumAttendeeCapacity`
  - `image`: the generated `/events/{id}/opengraph-image`
  - While the event is upcoming and published: `remainingAttendeeCapacity` and a free `Offer` (`price: 0`, `GBP`, `InStock` or `SoldOut` when full, `validFrom` set to the creation date)
  - Drafts get no `Event` node.
- **Group pages:** `Organization` with `url`, `description`, `logo`, `email`, `sameAs` (website and social links, when set) and `location` (`Place` with name, postcode and `geo`).
- **Event and group pages:** `BreadcrumbList` (Home → Events/Groups → page).

**Security:** `jsonLd()` in `@/lib/html` serialises the graph and unicode-escapes `<`, `>`, `&`, U+2028 and U+2029, so user text can't close the script or open a comment, and the JSON still parses to the same values. `<JsonLd>` is the only place that uses it. AGENTS.md documents this as the single sanctioned `dangerouslySetInnerHTML` sink. `html.test.ts` covers `</script>` and `<!--` payloads and round-tripping. `structured-data.test.ts` covers every builder, including cancelled, completed, past, full, unlimited-capacity, draft and missing-field cases.

**Not covered:** listing pages (`/events`, `/groups`) carry no `ItemList` or breadcrumbs, and group pages don't list their events. Google only shows event rich results from each event's own page, so these add little. (Watch list.)

#### SEO-H8 — ~~Renaming a group broke its URL~~ ✅ Fixed (W3)

**Location:** `src/app/groups/[slug]/edit/actions.ts`, `src/app/groups/[slug]/page.tsx`

Renaming a group regenerated its slug, and the old URL returned 404.

**Resolution:**
- Migration `0037_group_slug_history.sql` adds a `group_slug_history` table (public read via RLS). It has been applied.
- A `SECURITY DEFINER` trigger, `on_group_slug_change`, records the old slug on rename. It also deletes any history row whose slug is taken by a live group, so a live group always takes priority.
- `getCurrentSlugForOldGroupSlug()` in `src/lib/events.ts` resolves old slugs, and the group page calls `permanentRedirect()` (308) to the current slug.
- Types are added to `src/types/database.ts`, by hand (see TD-M9 and action A2).

**Not covered:** `/groups/{old-slug}/edit` still returns 404 (owner-only page, low impact). (Watch list.)

#### SEO-H9 — ~~`/events` duplicates and a short crawl window~~ ✅ Fixed (W3, W7)

**Location:** `src/app/events/(browse)/page.tsx`, `src/lib/search-params.ts`, `src/lib/events.ts`

**Done:**
- Disabled Previous/Next buttons now render as `<span aria-disabled>` through the new `src/components/PaginationLink.tsx`. URLs such as `?page=0` or one past the last page are no longer generated.
- Every `postcode`, `radius`, `from`, `to`, `page`, `pastPage` or `laterPage` variant is `noindex, follow`.
- The bare `/events` page has a "Coming up later" section listing published events after the default 7-day window (`DEFAULT_EVENT_RANGE_DAYS`), 10 per page, as plain links. `getLaterEvents()` paginates in the database with an exact count, so each request reads at most 10 rows from `events_with_counts` and runs in parallel with the main query. Filtered searches (`postcode`, `from`, `to`) skip it.

#### SEO-H10 — ~~`/impact` had 256 duplicate URL combinations~~ ✅ Fixed (W3)

**Location:** `src/app/impact/page.tsx`

`/impact` has four period parameters with four values each, all linked from the page.

**Resolution:** `generateMetadata` now gives the bare `/impact` a canonical and makes any variant with `orgPeriod`, `areaPeriod`, `statsPeriod` or `groupPeriod` `noindex, follow`.

---

### Medium priority

#### SEO-M1 — Internal linking — Open (W7, action A5)

- ~~Event and impact pages link organisers to `/profile/*`, which requires sign-in, so crawlers hit a dead end. Use `rel="nofollow"` or decide to make organiser pages public.~~ Done: `rel="nofollow"` (SEO-H2).
- The homepage body has no event or group links. Add "Upcoming near you" and "Featured groups" sections.
- ~~Event pages don't link to more events from the same group or nearby.~~ Done: the sidebar on `/events/[id]` shows "Other events nearby" (closest upcoming event within 20 km) and "More from this organiser" (the organiser's or group's next upcoming event). Each section is omitted when there is nothing to show. See `getRelatedEvents()` in `src/lib/events.ts`.
- The "Top areas" on `/impact` are plain text.
- `/events` and `/groups` don't link to each other except through the nav and footer.

#### SEO-M2 — ~~Heading structure~~ ✅ Fixed (W7)

**Location:** `src/app/page.tsx`, `src/app/events/(browse)/page.tsx`, `src/app/groups/(browse)/page.tsx`, `src/components/groups/GroupCard.tsx`, `src/components/groups/FeaturedGroupCard.tsx`, `src/app/groups/[slug]/page.tsx`, `src/app/impact/ImpactHero.tsx`

The issues were:

- `src/app/page.tsx` used an `<h2>` for an ordinary sentence ("Every bag collected helps…").
- On `/events`, `EventCard` used `<h3>` directly under the `<h1>`, skipping `<h2>`.
- `GroupCard` and `FeaturedGroupCard` had no heading for the group name.
- The group-page `<h1>` contained the share `<button>`.
- The `/impact` H1 ("Real people. Real impact.") had no keywords.

**Resolution:**
- The homepage sentence is now a `<p>`.
- `/events` has visually hidden `<h2>`s, "Upcoming litter picks" and "Past litter picks" (the past list is a labelled `<section>`), so the `EventCard` `<h3>`s nest correctly. `EventCard` keeps `<h3>` because every other page that uses it (group pages, dashboard, profiles) places it under an `<h2>`.
- The group name in `GroupCard` is an `<h3>`. In `FeaturedGroupCard` it's an `<h2>`, since the card sits directly under the `/groups` `<h1>`. `/groups` adds a visually hidden "All groups" `<h2>` above the card grid.
- On group pages the share button sits beside the `<h1>`, not inside it.
- The `/impact` H1 now ends with a smaller subtitle line: "UK litter picking impact, measured by our volunteers". This matches the page title, "UK Litter Picking Impact".

**Verified** on a local production build: `/`, `/events`, `/groups`, `/impact` and a group page each have one `<h1>` (plus the identical one in the streamed `loading.tsx` fallback) and no skipped levels. No group-page `<h1>` contains a `<button>`.

#### SEO-M3 — ~~Image SEO~~ ✅ Fixed (W7/W8)

**Location:** `src/components/events/EventPhotosGallery.tsx`, `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx`

The issues were:

- `EventPhotosGallery` used `alt="Event photo"` on every image.
- It loaded full-size images into 160px tiles with a raw `<img>`.
- Member-chip avatar alt text on group pages repeated the visible name.

**Resolution:**
- `EventPhotosGallery` takes an `eventTitle` prop. Alt text is `"{event title} litter pick – photo {n}"`; the "litter pick" suffix is left out when the title already contains "litter", to avoid doubling.
- The gallery uses `next/image` with `fill` and `sizes="(min-width: 1024px) 190px, (min-width: 640px) 33vw, 50vw"`, which matches the 2- and 3-column grid. Lazy loading is the `next/image` default. Each tile still links to the full-size original. Supabase storage was already allowed in `images.remotePatterns`.
- Member-chip avatars have `alt=""`, because the name is shown next to them.

**Verified** on a local production build: gallery images render through `/_next/image` with the new alt text and `sizes`, and the optimised URL returns `200 image/webp`. Member-chip avatars render with `alt=""`.

#### SEO-M4 — ~~Thin past events~~ ✅ Fixed (W5, W7)

**Location:** `src/lib/sitemap.ts`, `src/app/events/[id]/page.tsx`

Past `published` events that were never wrapped up only say "This event has finished".

**Resolution:**
- **Sitemap (W5):** they are left out 14 days after they start (`isSitemapEvent()`).
- **Event page (W7):** `generateMetadata` passes `indexable: !isStaleEvent(event, new Date())` to `pageMetadata()`, so a stale event is `noindex, follow` with no canonical. `isStaleEvent()` and `isSitemapEvent()` share one grace-period check (`STALE_EVENT_GRACE_DAYS`), so the page and the sitemap can't drift.
- **Cancelled events stay indexable.** Their page carries `EventCancelled` structured data (SEO-H7), which Google can only use while the page can be indexed. They are still left out of the sitemap. Completed events are never stale.
- The page is rendered per request, so an event flips to `noindex` on its own once the 14 days pass. Logging stats before then (status `completed`) keeps it indexable.

**Verified** on a local production build, using a Googlebot user agent: three published events that started 20 days to 7 weeks ago return `<meta name="robots" content="noindex, follow"/>` with no canonical, and are absent from `sitemap.xml`. Upcoming events return a canonical and no robots tag.

Unit tests (`src/lib/sitemap.test.ts`) cover `isStaleEvent()`, including agreement with `isSitemapEvent()`.

#### SEO-M5 — ~~Language and locale~~ ✅ Fixed (W2)

`<html lang="en-GB">` and `openGraph.locale: "en_GB"`.

#### SEO-M6 — ~~Beta banner hydration mismatch / CLS~~ ✅ Fixed (W8)

**Location:** `src/components/layout/BetaBanner.tsx`, `src/app/layout.tsx`, `src/lib/constants.ts`

`BetaBanner` read `sessionStorage` during render. The server always rendered the banner and the client rendered nothing, which caused a hydration mismatch and a layout shift at the top of the page for users who had dismissed it.

**Resolution:**
- Dismissal is stored in a session cookie (`BETA_BANNER_DISMISSED_COOKIE`, `beta-banner-dismissed`), not `sessionStorage`.
- `RootLayout` reads the cookie on the server and passes `initiallyDismissed` to `BetaBanner`. The server HTML and the first client render now agree, so there is no mismatch and nothing shifts.
- The layout was already dynamic because `Navbar` reads the auth cookies, so reading one more cookie adds no rendering cost.
- The banner message, feedback link and dismiss button are unchanged. The banner is now hidden by default through `SHOW_BETA_BANNER` in `src/lib/constants.ts` (LitterLink is out of beta), and `RootLayout` only renders it, and only reads the cookie, when that flag is `true`. Nothing was removed, so it can be reactivated for temporary messages by flipping the flag.
- A first attempt kept `sessionStorage` and read it with `useSyncExternalStore`, with a "dismissed" server snapshot. That removed the mismatch but made the banner appear after hydration for every new visitor, which measured 0.036 CLS. The cookie approach avoids that.

**Verified** against the local dev server in a browser:
- **New visitor:** the banner is in the raw server HTML, there were no layout shifts, and there were no hydration warnings.
- **After dismissing:** the banner disappears, the cookie is set, and it stays hidden across client-side navigation.
- **Hard reload after dismissing:** the raw server HTML has no banner, there were no layout shifts, and there were no hydration warnings.

**Note:** while the banner is enabled, dismissing it sets a first-party session cookie. It holds no personal data. The privacy policy's cookie section (section 11) covers essential session technology only and does not mention it. Add a line there if the banner is reactivated. (Watch list.)

#### SEO-M7 — ~~Server response time~~ ✅ Fixed (W8)

**Location:** `src/lib/supabase/middleware.ts`, `src/components/layout/Navbar.tsx`, `src/lib/map-pins.ts`, `src/components/map/EventsMap.tsx`, `src/components/map/GroupsMap.tsx`, `src/lib/impact.ts`, `src/app/page.tsx`

Three things made responses slower or heavier than they needed to be. Signed-in visitors paid for extra Supabase Auth round trips on every request. The `/events` and `/groups` pages, and both detail pages, serialised whole event and group rows into the HTML for their map components. The homepage summed every `event_stats` row in the app, and PostgREST caps that read at 1,000 rows (the same failure mode as TD-H2).

**Resolution:**
- **Auth calls.** `Navbar` and the proxy no longer ask the Auth server about the user on every request.
  - `Navbar` reads the access-token claims with `getClaims()` and loads the profile with `claims.sub`. The claims are verified locally against the project's signing keys, which the SDK fetches once and caches for 10 minutes. The project already publishes an ES256 key.
  - The proxy (`updateSession`) calls `getUser()` only where it makes an access decision: `/dashboard`, `/events/create`, `/profile` and `/profile/*`, `/sign-in` and `/sign-up`. Every other route calls `getClaims()`, which still refreshes an expiring session and sets the cookies. The proxy also runs on link prefetches, so each of those used to cost an Auth call as well.
  - Pages, Server Actions and the protected routes keep `getUser()`. Claims are never used to grant access. `AGENTS.md` documents the split.
  - If a token is still signed with the legacy HS256 secret, `getClaims()` falls back to a normal `getUser()` call, so it is never slower than before.
  - Anonymous visitors and crawlers were not affected: the SDK returns early when there is no session, so they never made an Auth call.
- **Map payloads.** New `src/lib/map-pins.ts` defines `EventPin` and `GroupPin` and the converters `toEventPins()` and `toGroupPins()`. `EventsMap` and `GroupsMap` now take pins, and the four pages that render them convert before passing props. A pin holds only what a marker and its popup show. `toGroupPins()` also drops groups without coordinates, which the map never drew. Props passed to a Client Component are serialised into the page, so the full rows had put every description, organiser detail and group contact email into the HTML. `AGENTS.md` now records the rule.
- **Homepage stats.** `getHomepageStats()` in `src/lib/impact.ts` reads the completed-event count and the pre-summed `total_bags` and `total_volunteers` from the existing `national_impact_stats` view, as `/impact` already did (TD-H2). The homepage no longer reads or truncates `event_stats`. `NationalStats` is now a module-level type shared by both functions.

**Trade-off:** a session revoked elsewhere (signed out everywhere, or a deleted user) can keep showing as signed in in the navbar on public pages until its access token expires, which is 1 hour by default. Pages and Server Actions still call `getUser()`, so access is unaffected. The cookies are still cleared on `/sign-in`, `/sign-up` and the protected routes, so there is no redirect loop.

**Not changed:** (Watch list)
- `Navbar` still runs one profile query for signed-in visitors. Anonymous visitors run none.
- Every page is still rendered per request, because `Navbar` reads the auth cookies in the root layout. Caching public pages would need the signed-in navbar out of the static shell, which is a larger change than this item.
- On protected pages the number of `GET /auth/v1/user` calls is the same as before: the proxy's verified call plus the page's own. `Navbar`'s call and the page's were already shared within a render.

**Verified** with `npm test` (291 tests), `npm run typecheck`, `npm run lint` and `npm run build` all passing:
- **Page weight**, on a local production build against the live data. HTML bytes, with gzip in brackets:

  | Page | Before | After |
  |---|---|---|
  | `/events?from=…&to=…` (a 12-month window, 164 events) | 338,871 (51,041) | 163,317 (25,402) |
  | `/events` (next 7 days, 2 events) | 111,478 (14,756) | 108,496 (14,203) |
  | `/groups` (9 groups) | 107,927 (14,786) | 102,715 (13,535) |
  | `/events/{id}` | 72,360 (13,938) | 69,949 (13,546) |
  | `/groups/{slug}` | 79,958 (13,645) | 79,157 (13,582) |
  | `/` | 45,680 (8,798) | 45,680 (8,798) |

  Full event and group rows in the HTML went from 164 to 0 on the wide `/events` page, and from 9 to 0 on `/groups`.
- **Maps in a browser:** `/events` (164 markers), `/groups` (9 markers) and the event and group detail pages (1 each) draw all their markers. The popups still show the title, date and address, or the group type, place and counts, with the right link.
- **Homepage figures** are the same before and after: 125 events, 1,703 bags and 1,080 volunteers.
- **Auth calls**, counted with `next dev` against a local fake of the Supabase Auth and REST endpoints that serves an ES256 key and signed-in cookies. This counts requests, not time:

  | Request | `GET /auth/v1/user` before | After |
  |---|---|---|
  | Anonymous, any page | 0 | 0 |
  | Signed in, public page (`/terms`, `/`) | 2 | 0 |
  | Signed in, access token expired | 2, plus 1 refresh | 0, plus 1 refresh and the new cookie set |
  | Signed in, `/dashboard` or `/events/create` | 2 | 2 |
  | Signed in, `/sign-in` (redirects to `/dashboard`) | 1 | 1 |
  | Revoked session, `/sign-in` | 1, cookie cleared | 1, cookie cleared |
  | Revoked session, public page | 1, cookie cleared, navbar signed out | 0, navbar still signed in (the trade-off above) |
  | Legacy HS256 token, public page | 2 | 2 (falls back to the Auth server) |

  The signing keys were fetched on the first signed-in request only, once for the proxy and once for the page render in `next dev`, then cached.
- **Unit tests:** `src/lib/map-pins.test.ts` asserts that pins hold only the allowed fields. `src/lib/impact.test.ts` asserts that the homepage reads `national_impact_stats` and never `event_stats`. `src/lib/supabase/middleware.test.ts` asserts which routes call `getUser()` and which call `getClaims()`, the redirects, the `noindex` header on profile routes, and that cookies refreshed by `getClaims()` reach the response.

**Note:** the saving relies on asymmetric JWT signing keys, which the project has enabled. With legacy HS256 keys the code still works, but `getClaims()` would call the Auth server each time and the saving would disappear.

#### SEO-M8 — ~~Site URL defined in many places~~ ✅ Fixed (W2)

**Location:** `src/lib/seo.ts`, `src/app/(auth)/actions.ts`, `src/lib/email.ts`

**Resolution:** `SITE_URL` / `absoluteUrl()` in `src/lib/seo.ts` are now the single source of the site URL in `layout.tsx`, `robots.ts`, `sitemap.ts`, `proxy.ts`, `events/[id]/page.tsx`, `(auth)/actions.ts` and `email.ts`. The auth actions and every email link now go through `absoluteUrl()`, which also strips a trailing slash from `NEXT_PUBLIC_SITE_URL`. This finishes what TD-H3 started in `(auth)/actions.ts`.

**Not changed:** the `send-event-reminders` Supabase Edge Function (Deno) keeps its own fallback because it cannot import from `src/`. (It is also the file action A3 touches.)

#### SEO-M9 — ~~The proxy runs on `robots.txt` and `sitemap.xml`~~ ✅ Fixed (W8)

**Location:** `src/proxy.ts`, `src/proxy.test.ts`

`robots.txt`, `sitemap.xml` and `manifest.webmanifest` went through the proxy, so every crawler fetch of them paid for a Supabase `getUser()` call and could pick up refreshed auth cookies.

**Resolution:**
- The proxy matcher now excludes `robots.txt`, `sitemap.xml` and `manifest.webmanifest`, so the proxy does not run on them at all.
- The `www` → bare-domain 308 for these files comes from the Vercel domain redirect, which runs before the proxy. The proxy's own `www` check stays as a fallback for the paths it still runs on, but it no longer covers these three files, so don't rely on it for them.
- Auth and profile route protection is unchanged. Protected routes were never covered by the excluded paths.

**Verified:**
- `src/proxy.test.ts` uses Next's `unstable_doesMiddlewareMatch()` to assert that the proxy runs on pages and protected routes, and skips the three metadata files, static assets and `favicon.ico`.
- The compiled matchers in `.next/server/functions-config-manifest.json` match the source.
- On a local production build, `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest` all return `200`.

---

## Part C — Reference

### Already implemented correctly (before the SEO audit)

- `metadataBase` and a `%s | LitterLink` title template in the root layout.
- Per-page metadata on most routes; `generateMetadata` with awaited `params` on event and group detail pages.
- `robots.ts` and `sitemap.ts` exist; the sitemap excludes drafts and cancelled events (RLS also hides drafts from anonymous users; cancelled event pages stay public and indexable).
- Every private route redirects anonymous visitors, via the proxy (`updateSession`) or an in-page `redirect()`.
- 308 redirect from www to the bare domain; profiles accessed by UUID redirect to the username URL.
- Detail pages call `notFound()` without a `loading.tsx`, so they return real 404s rather than soft 404s (see TD-L3).
- Event and group content is server-rendered with real `<Link>` elements; events link to their group and groups link to their events.
- One `<h1>` per key page.
- Logos and avatars use `next/image` with alt text; the navbar logo uses `priority`.
- Leaflet loads lazily inside fixed-height wrappers, so maps cause no layout shift.
- `next/font`, Vercel Speed Insights, and file-convention icons and manifest.
- Next 16 automatically serves blocking (non-streamed) metadata to crawlers that can't run JavaScript (`htmlLimitedBots`).

### SEO work completed (W1–W8)

#### New files

| File | Purpose |
|---|---|
| `src/app/opengraph-image.png` | Default 1200×630 share image for Open Graph and X (W4) |
| `src/app/events/[id]/opengraph-image.tsx` | Generated per-event share image (W4) |
| `src/app/groups/[slug]/opengraph-image.tsx` | Generated per-group share image (W4) |
| `src/lib/share-image.ts` (+ test) | Share-card content: title fitting, London date formatting, event status badges, meeting point plus district, `groupShareCard()` (W4) |
| `src/lib/share-image-render.tsx` | Server-only branded `ImageResponse` template shared by event and group images; background photo with a white-to-transparent gradient overlay (W4) |
| `public/images/litter-picking-background.jpg` | Background photo for generated share images (W4) |
| `src/assets/fonts/Geist-{Regular,Bold}.ttf`, `OFL.txt` | Fonts for generated share images (W4) |
| `src/lib/seo.ts` | `SITE_URL`, `SITE_NAME`, `DEFAULT_DESCRIPTION`, `DEFAULT_SHARE_IMAGE`, `OPEN_GRAPH_DEFAULTS` (includes the share image), `TWITTER_DEFAULTS`, `NOINDEX`, `NOINDEX_FOLLOW`, `absoluteUrl()`, `metaDescription()`, `districtName()`, `hasListingParams()`, `pageMetadata()` (`defaultImage: false` for routes with their own `opengraph-image`) |
| `src/lib/seo.test.ts` | Tests for URL building, description truncation, listing-parameter detection and `pageMetadata()` output |
| `src/components/PaginationLink.tsx` | Renders a `<span>` instead of a link when pagination is disabled |
| `src/app/(auth)/layout.tsx` | `noindex, follow` for all auth pages |
| `src/app/dashboard/layout.tsx` | `noindex, nofollow` |
| `src/app/profile/layout.tsx` | `noindex, nofollow` for `/profile` and `/profile/[id]` |
| `supabase/migrations/0037_group_slug_history.sql` | Old-slug history table, RLS, and the maintenance trigger |
| `supabase/migrations/0038_events_with_counts_location_display.sql` | Adds `location_outcode` and `location_admin_district` to `events_with_counts` (W4) |
| `src/lib/sitemap.ts` (+ test) | `buildSitemap()`, `isSitemapEvent()` (stale-event rule), `isStaleEvent()` (page-level `noindex`, W7), `eventLastModified()`, `STALE_EVENT_GRACE_DAYS`, `SITEMAP_URL_LIMIT` (W5) |
| `src/lib/legal.ts` | `TERMS_LAST_UPDATED`, `PRIVACY_LAST_UPDATED`, `formatLegalDate()`, shared by the legal pages and the sitemap (W5) |
| `src/proxy.test.ts` | Asserts the proxy matcher: runs on pages, skips metadata files and static assets (W8, SEO-M9) |
| `src/lib/structured-data.ts` (+ test) | JSON-LD builders: `siteOrganizationJsonLd()`, `websiteJsonLd()`, `eventJsonLd()`, `groupOrganizationJsonLd()`, `breadcrumbJsonLd()`, `jsonLdGraph()` (W6) |
| `src/components/JsonLd.tsx` | Renders one `@graph` `<script type="application/ld+json">` through `jsonLd()` (W6) |
| `src/lib/map-pins.ts` (+ test) | Client-safe `EventPin` / `GroupPin` shapes and `toEventPins()` / `toGroupPins()`, so the maps only receive what they draw (W8, SEO-M7) |
| `src/lib/supabase/middleware.test.ts` | Asserts which routes call `getUser()` and which call `getClaims()`, the redirects, the profile `noindex` header and cookie pass-through (W8, SEO-M7) |
| `src/lib/impact.test.ts` | Asserts the homepage stats read the `national_impact_stats` view, not `event_stats` (W8, SEO-M7) |

#### Modified files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Root metadata from `@/lib/seo`; removed `og:url`/`og:title`; `lang="en-GB"`; `twitter: TWITTER_DEFAULTS` (W4) |
| `src/proxy.ts` | Coming-soon handling removed; uses `SITE_URL`; matcher skips `robots.txt`, `sitemap.xml` and `manifest.webmanifest` (W8, SEO-M9) |
| `src/app/robots.ts` | Uses `absoluteUrl()`; coming-soon handling removed; disallows `/api/`, no longer `/profile` (W5) |
| `src/app/sitemap.ts` | Uses `SITE_URL`; coming-soon handling removed; now a thin wrapper around `getSitemapData()` and `buildSitemap()`, with a warning over 50,000 URLs (W5) |
| `src/app/coming-soon/page.tsx` | Deleted |
| `src/app/page.tsx` | Homepage `pageMetadata()` with an absolute title and canonical `/` |
| `src/app/events/(browse)/page.tsx` | `generateMetadata` with listing `noindex`; `parsePostcode()`; `PaginationLink` |
| `src/app/groups/(browse)/page.tsx` | Same as `/events` |
| `src/app/impact/page.tsx` | `generateMetadata` with period-parameter `noindex` |
| `src/lib/impact.ts` | "Top areas" uses `districtName()` for its labels (W4) |
| `src/app/events/[id]/page.tsx` | Descriptive title, trimmed description, canonical, Open Graph; `absoluteUrl()` for the share URL; `defaultImage: false` so the generated image applies; `districtName()` for the title place (W4) |
| `src/lib/events.ts` | `getEventById` and `getGroupBySlug` wrapped in React `cache()` (W4) |
| `src/app/groups/[slug]/page.tsx` | Descriptive metadata and canonical; 308 redirect for old slugs; `defaultImage: false` so the generated image applies (W4) |
| `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | `pageMetadata()` with canonicals; fixed the doubled terms title; "Last updated" date from `src/lib/legal.ts` (W5) |
| `src/app/(auth)/*/page.tsx` | Distinct titles |
| `src/app/admin/layout.tsx` | `robots: NOINDEX` |
| `events/create`, `events/[id]/edit`, `events/[id]/stats`, `groups/create`, `groups/[slug]/edit`, `become-a-verified-organiser` | `robots: NOINDEX` |
| `src/app/profile/page.tsx`, `src/app/profile/[id]/page.tsx` | Fixed doubled title suffixes |
| `src/lib/search-params.ts` (+ test) | `parsePostcode()` |
| `src/lib/events.ts` | `getCurrentSlugForOldGroupSlug()`; `getSitemapData()` with a throwing, paginated `fetchAllRows()` (W5) |
| `src/types/database.ts` | `group_slug_history` table type (hand-edited; see action A2) |
| `src/lib/html.ts` (+ test) | `jsonLd()` serialiser (W6) |
| `src/lib/seo.ts` | `CONTACT_EMAIL`, `SOCIAL_PROFILES`, `SITE_LOGO` (W6) |
| `src/components/layout/Footer.tsx` | Social links and contact email from `@/lib/seo` (W6) |
| `src/app/page.tsx`, `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx` | Render `<JsonLd>` (W6) |
| `AGENTS.md` | Documents `src/lib/seo.ts` and the metadata conventions; `structured-data.ts` and the JSON-LD `dangerouslySetInnerHTML` exception (W6) |
| `src/app/page.tsx` | The "Every bag collected…" sentence is a `<p>`, not an `<h2>` (W7, SEO-M2) |
| `src/app/events/(browse)/page.tsx` | Visually hidden "Upcoming litter picks" / "Past litter picks" `<h2>`s above the event cards (W7, SEO-M2) |
| `src/app/groups/(browse)/page.tsx` | Visually hidden "All groups" `<h2>` above the card grid (W7, SEO-M2) |
| `src/components/groups/GroupCard.tsx`, `FeaturedGroupCard.tsx` | Group name wrapped in an `<h3>` / `<h2>` (W7, SEO-M2) |
| `src/app/groups/[slug]/page.tsx` | Share button moved out of the `<h1>`; member-chip avatars `alt=""` (W7, SEO-M2/M3) |
| `src/app/impact/ImpactHero.tsx` | Keyword-bearing H1 subtitle (W7, SEO-M2) |
| `src/components/events/EventPhotosGallery.tsx` | `next/image` with `sizes`; per-photo alt text from the new `eventTitle` prop (W7, SEO-M3) |
| `src/app/events/[id]/page.tsx` | Passes `eventTitle` to `EventPhotosGallery` (W7, SEO-M3) |
| `src/app/events/[id]/page.tsx` | `generateMetadata` sets `indexable: false` for stale events via `isStaleEvent()` (W7, SEO-M4) |
| `src/lib/supabase/middleware.ts` | `getUser()` only on protected and sign-in/sign-up routes; `getClaims()` refreshes the session everywhere else (W8, SEO-M7) |
| `src/components/layout/Navbar.tsx` | Reads the token claims with `getClaims()` instead of calling `getUser()` (W8, SEO-M7) |
| `src/components/map/EventsMap.tsx`, `src/components/map/GroupsMap.tsx` | Take `EventPin[]` / `GroupPin[]` instead of full rows (W8, SEO-M7) |
| `src/app/events/(browse)/page.tsx`, `src/app/groups/(browse)/page.tsx`, `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx` | Convert to pins before passing props to the maps (W8, SEO-M7) |
| `src/lib/impact.ts`, `src/app/page.tsx` | `getHomepageStats()` reads `national_impact_stats`; the homepage no longer sums `event_stats` itself (W8, SEO-M7) |
| `AGENTS.md` | Documents the display-only `getClaims()` exception, the proxy split and the slim-pins rule (W8, SEO-M7) |

### Conventions for new pages

- **Public, indexable page:** export `metadata = pageMetadata({ title, description, path })`.
- **Listing page with filters or pagination:** use `generateMetadata({ searchParams })` and pass `indexable: !hasListingParams(params, [...filterKeys])`.
- **Private or account page:** set `robots: NOINDEX`, ideally in the section's layout.
- **Protected page:** do its own `getUser()` check and redirect to `/sign-in?redirectTo=…`. The page-level check is authoritative; the proxy is only an early redirect (TD-L2).
- **Never** put `alternates` or `openGraph.url` / `openGraph.title` in the root layout; child pages inherit them.
- **Share images:** `pageMetadata()` includes `DEFAULT_SHARE_IMAGE` through `OPEN_GRAPH_DEFAULTS`. If you build `openGraph` by hand, spread `OPEN_GRAPH_DEFAULTS` so the image is kept. Don't set `twitter.images`; X inherits the Open Graph image.
- **Generated share images:** add `opengraph-image.tsx` beside the page, render with `renderShareImage()` from `@/lib/share-image-render`, and pass `defaultImage: false` to `pageMetadata()`. Otherwise the default image wins over the file.
- Don't include "LitterLink" in page titles; the root template adds it.
- **Structured data:** build nodes with `@/lib/structured-data` and render them with `<JsonLd nodes={[...]} />`. Never write an `application/ld+json` script by hand.
- **Free-text form fields:** read them with `readFormFields()` from `@/lib/input`, never `formData.get()` directly (TD-M11).
- **Props to Client Components:** pass only what is rendered. Use `toEventPins()` / `toGroupPins()` for the maps (SEO-M7).
- **Aggregates and lists:** never rely on an unbounded PostgREST read. It caps at 1,000 rows. Use a view, `.range()` pagination or a count (TD-H2, SEO-H3, SEO-M7).

### Verification (local production build, Googlebot user agent)

These checks were run by hand. Action A1 proposes automating them.

| URL | Result |
|---|---|
| `/` | `<title>LitterLink — Find Local Litter Picks Near You</title>`, canonical `/` |
| `/events` | Canonical `/events`, `og:url` `/events` |
| `/events?page=2` | `noindex, follow`, no canonical |
| `/events?postcode=Buy cheap stuff at spam.example` | `noindex, follow`; no visible echo of the text |
| `/groups` | Canonical `/groups` |
| `/impact` / `/impact?orgPeriod=all` | Canonical / `noindex, follow` |
| `/terms` | `Terms & Conditions \| LitterLink`, canonical `/terms` |
| `/sign-in?error=hello` | `noindex, follow` |
| All pages | `<html lang="en-GB">` |
| `/`, `/events`, `/terms`, `/sign-in` (W4) | `og:image` and `twitter:image` → `/opengraph-image.png` (1200×630, `image/png`, alt text); `twitter:card` `summary_large_image`; `twitter:site` `@litterlink_`; `twitter:title`/`twitter:description` match each page |
| `/opengraph-image.png` (W4) | `200`, `image/png` |
| `/events/{id}` for upcoming, completed, long-title and group-hosted events (W4) | `og:image` and `twitter:image` → `/events/{id}/opengraph-image?<hash>` (1200×630, `image/png`, alt text) |
| `/events/{id}/opengraph-image` (W4) | `200`, `image/png`, about 950 KB with the background photo, about 1 s; `Cache-Control: public, max-age=0, must-revalidate` |
| `/events/{unknown}/opengraph-image` (W4) | `404` |
| `/groups/{slug}` for a short-name and a long-name group (W4) | One `og:image` and `twitter:image` each → `/groups/{slug}/opengraph-image?<hash>` (1200×630, `image/png`, alt text); `twitter:card` `summary_large_image` |
| `/groups/{slug}/opengraph-image` (W4) | `200`, `image/png`, about 940 KB, about 0.9–1.4 s; `Cache-Control: public, max-age=0, must-revalidate` |
| `/groups/{unknown}/opengraph-image` (W4) | `404` |
| `/sitemap.xml` (W5) | `200`, `application/xml`, 149 URLs: 6 site pages, 134 events, 9 groups. Static pages carry derived or "Last updated" `lastmod` values (no request-time stamps); `/groups` and group pages carry none. Sampled event and group URLs return `200` |
| `/robots.txt` (W5) | `Allow: /`; disallows `/dashboard`, `/admin`, `/auth` and `/api/`; `Sitemap:` line points at `/sitemap.xml` |
| `/terms`, `/privacy` (W5) | "Last updated" text unchanged: 3 April 2026 / 24 September 2026 |
| `/` (W6) | One JSON-LD script: `Organization` (logo, email, three `sameAs` links) and `WebSite` linked by `@id` |
| `/events/{id}` for upcoming events, with and without a capacity limit (W6) | `Event` with `InStock` free `Offer`; `maximumAttendeeCapacity` and `remainingAttendeeCapacity` when a limit is set; group or `Person` organiser; `BreadcrumbList` Home → Events → title |
| `/events/{id}` for past events (W6) | `Event` with `EventScheduled`, no `Offer`; multi-line descriptions are JSON-escaped correctly |
| `/events/{id}/opengraph-image`, `/android-chrome-512x512.png` (W6) | `200`, `image/png` (the JSON-LD `image` and `logo` URLs) |
| `/groups/{slug}` (W6) | `Organization` with logo, email, `sameAs`, `Place` with postcode and `geo`; `BreadcrumbList` Home → Groups → name |
| `/events` (W6) | No JSON-LD |

---

## Part D — Delivery order already completed (record)

**Tech debt**

1. ~~**TD-C1** — commit `supabase/`.~~ Done.
2. ~~**TD-H1** (opt-out removed) and **TD-H3**.~~ Done.
3. ~~**TD-H2** — impact figures are the product's headline claim.~~ Done.
4. ~~**TD-M4**, **TD-M1**.~~ Done. **TD-M9** was in the same group of cheap groundwork and is still open (A2).
5. **TD-H5** and ~~**TD-H4**~~ — unit tests and CI done; the rest is A1.
6. Remaining Medium and Low items — see section 2.

**SEO**

1. ~~**W4 – Share metadata.**~~ ✅ Done:
   - ~~Root `opengraph-image.png`.~~ Done.
   - ~~`twitter` card in the root layout.~~ Done.
   - ~~Dynamic `opengraph-image.tsx` for events and groups.~~ Done (see SEO-H6).
   - ~~`cache()` around `getEventById` and `getGroupBySlug`.~~ Done.
   - ~~Expose `location_outcode` and `location_admin_district` in `events_with_counts`.~~ Done in migration `0038`, now applied (see SEO-H5).
2. ~~**W5 – Sitemap and robots:**~~ ✅ Done:
   - ~~Add groups, `/groups`, `/impact` and the legal pages.~~ Done (see SEO-H3).
   - ~~`.range()` pagination; real `lastModified`; drop stale, never-wrapped-up events.~~ Done (see SEO-H3 and SEO-M4).
   - ~~Disallow `/api/`; resolve the `/profile` disallow (SEO-H2).~~ Done.
3. ~~**W6 – JSON-LD:**~~ ✅ Done (see SEO-H7):
   - ~~`jsonLd()` serialiser with tests.~~ Done.
   - ~~`Organization` / `WebSite` on the homepage, `Event` on event pages, `Organization` on group pages, `BreadcrumbList` on detail pages.~~ Done.
   - ~~Document the exception in AGENTS.md.~~ Done.
4. **W7 – Linking and content:**
   - Homepage event and group sections. (Open: action A5.) ~~Related or nearby events on event pages.~~ Done (see SEO-M1).
   - ~~Decide on profile links (public pages or `nofollow`).~~ `nofollow` (SEO-H2).
   - ~~Heading fixes (SEO-M2) and photo alt text (SEO-M3).~~ Done.
   - ~~Upcoming list beyond 7 days (SEO-H9).~~ Done.
   - ~~Remove `?back=` from card links.~~ Done (see SEO-C4).
5. ~~**W8 – Core Web Vitals:**~~ ✅ Done (see SEO-M3, SEO-M6, SEO-M7 and SEO-M9):
   - ~~Fix the beta banner hydration/CLS (SEO-M6).~~ Done.
   - ~~Slim map props (SEO-M7);~~ ~~`next/image` in the gallery~~ (done with SEO-M3).
   - ~~Homepage stats from `national_impact_stats` (SEO-M7).~~ ~~Proxy matcher exclusions (SEO-M9).~~ Done.
   - ~~Fewer Auth round trips in the proxy and `Navbar` (SEO-M7).~~ Done.
6. ~~**Tidy-ups:**~~
   - ~~Move the remaining inline site URLs in `(auth)/actions.ts` and `email.ts` to `SITE_URL` (SEO-M8).~~ Done.
   - ~~Thin-event `noindex` on the page itself (SEO-M4).~~ Done.

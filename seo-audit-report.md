# LitterLink — Technical SEO Audit

**Date:** 4 October 2026
**Scope:** Technical SEO across `src/app/`, `src/components/`, `src/lib/`, `src/proxy.ts`, `robots.ts`, `sitemap.ts`, metadata and routing. Next.js 16 behaviour was checked against the installed docs in `node_modules/next/dist/docs/`.
**Public routes in scope:** `/`, `/events`, `/events/[id]`, `/groups`, `/groups/[slug]`, `/impact`, `/privacy`, `/terms`
**Status:** W1–W6 implemented (W4: default image, X card and generated event images 15 October 2026; generated group images and the `events_with_counts` place-name fix 16 October 2026; W5: complete sitemap 16 October 2026; W6: JSON-LD structured data 17 October 2026). W7 in progress: heading structure (M2) and image SEO (M3) fixed 17 October 2026; thin past events (M4) fixed 23 October 2026. W8 in progress: banner hydration mismatch and layout shift (M6) fixed 25 October 2026. Migration `0038` has been applied, so event titles now show place names. `npm test` (235 tests), `npm run typecheck`, `npm run lint` and `npm run build` all pass. Rendered `<head>` output, JSON-LD, `sitemap.xml` and `robots.txt` were verified against a local production build using a Googlebot user agent.

## Summary

The basics were already sound. Event and group content is server-rendered with real links. Detail pages return genuine 404s. Private routes redirect anonymous visitors. `robots.ts`, `sitemap.ts` and a title template were already in place.

The serious gaps were about **indexing control and duplication**:

- Auth pages and the postcode filter could be indexed while echoing arbitrary text from the URL.
- Every page inherited the homepage's `og:url` and `og:title` from the root layout.
- No page had a canonical URL.
- Coming-soon mode only hid part of the site. (The mode has since been removed entirely; see C5.)

All critical issues are now fixed. The remaining work is mainly enhancement: internal linking and performance.

| Severity | Total | Fixed | Partially fixed | Open |
|---|---|---|---|---|
| Critical | 5 | 5 | 0 | 0 |
| High | 10 | 9 | 1 | 0 |
| Medium | 9 | 5 | 1 | 3 |

### Workstreams

| ID | Workstream | Status |
|---|---|---|
| W1 | Indexing controls | ✅ Done |
| W2 | Titles and shared metadata | ✅ Done |
| W3 | Canonical URLs and query-parameter duplicates | ✅ Done |
| W4 | Open Graph, X and share images | ✅ Done |
| W5 | Sitemap and robots | ✅ Done |
| W6 | Structured data (JSON-LD) | ✅ Done |
| W7 | Internal linking, content and headings | In progress (M2, M3, M4 done) |
| W8 | Core Web Vitals | In progress (M6 done) |

---

## Deployment notes

1. **Migrations:** `0037_group_slug_history.sql` and `0038_events_with_counts_location_display.sql` have both been applied. No migrations are outstanding.
2. **`COMING_SOON` environment variable:** removed from the hosting provider. Nothing reads it any more.
3. **Google Search Console:**
   - ✅ `sitemap.xml` submitted (16 October 2026).
   - ✅ URL Inspection run on `/`, an event page and a group page; no issues found (17 October 2026).
   - ✅ An upcoming event page and a group page passed the [Rich Results Test](https://search.google.com/test/rich-results), and the detected data is correct (17 October 2026).
   - Ongoing: watch the Events and Breadcrumbs reports under Enhancements as Google recrawls (W6).
   - Still to do: look in the Pages report for "Duplicate without user-selected canonical" and "Indexed, though blocked by robots.txt".

---

## Critical before launch

### C1 — ~~Auth pages could be indexed and reflected text from the URL~~ ✅ Fixed (W1)

**Location:** `src/app/(auth)/*`, `src/app/page.tsx`

`/sign-in` printed `?error=` and `?message=` on the page, and the homepage forwarded `?error_description=` to it. None of the four auth pages had metadata or `noindex`. Anyone could have got arbitrary text indexed on the domain.

**Resolution:**
- New `src/app/(auth)/layout.tsx` sets `robots: NOINDEX_FOLLOW`. The pages stay crawlable so search engines can see the directive.
- Each auth page now has a distinct title: "Sign in", "Sign up", "Forgot password" and "Reset password".

### C2 — ~~The postcode filter echoed arbitrary text, with no noindex or canonical~~ ✅ Fixed (W1/W3)

**Location:** `src/app/events/(browse)/page.tsx`, `src/app/groups/(browse)/page.tsx`

The raw `?postcode=` value was printed next to the H1 and in a "wasn't recognised" notice.

**Resolution:**
- New `parsePostcode()` in `src/lib/search-params.ts` only accepts trimmed values of 10 characters or fewer that match `UK_POSTCODE_PATTERN`, returned upper-cased. Tests are included.
- Invalid input shows a generic "That postcode wasn't recognised." and is left out of pagination links.
- Filtered variants are `noindex, follow` (see C4).

**Residual:** the raw value still appears in Next's router (RSC) payload and in the filter input's `value` attribute. It is not visible on-page text, and the URL is `noindex`.

### C3 — ~~Every page inherited the homepage's Open Graph URL and title~~ ✅ Fixed (W2)

**Location:** `src/app/layout.tsx`

The root layout set `openGraph.url: "/"` and a homepage `og:title`. Next.js merges metadata shallowly, so every page without its own `openGraph` claimed to be the homepage when shared.

**Resolution:**
- The root layout now sets only `siteName`, `type` and `locale: "en_GB"` (`OPEN_GRAPH_DEFAULTS`).
- Every public page sets its own `og:title`, `og:description` and `og:url` through `pageMetadata()`.

### C4 — ~~No canonical URLs; event links added a `?back=` parameter~~ ✅ Fixed (W3)

**Location:** `src/components/events/EventCard.tsx`, all public pages

Nothing set `alternates.canonical`. Event cards on filtered `/events` pages link to `/events/{id}?back=…`, so a single event had many URLs.

**Resolution:**
- These pages now have canonicals: `/`, `/events`, `/groups`, `/impact`, `/events/{id}`, `/groups/{slug}`, `/privacy` and `/terms`.
- Filtered and paginated listing variants get `noindex, follow` *without* a canonical, because Google advises against combining the two. Unrelated parameters such as `?flash=` and `utm_*` keep the canonical.
- Event card links no longer add `?back=` (W7), so each event has one URL. The "All events" link on the event page always goes to `/events`; the browser Back button still restores the filtered list.

### C5 — ~~Coming-soon mode only partly hid the site~~ ✅ Removed

**Location:** `src/proxy.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/coming-soon/page.tsx`

Only `/`, `/events` and `/events/*` redirected. Groups, impact, auth and legal pages stayed indexable, and the sitemap kept listing URLs that redirected.

**Resolution:** the site has launched, so coming-soon mode has been removed entirely:
- The `/coming-soon` route is deleted (it now returns 404; it was always `noindex`, so nothing indexed is lost).
- `isComingSoon()` and the `COMING_SOON` flag are gone, and the variable has been removed from the hosting provider.
- The proxy no longer redirects or adds `X-Robots-Tag`.
- `sitemap.ts` always lists URLs and `robots.ts` always includes the `Sitemap:` line.

---

## High priority

### H1 — ~~Private routes had no noindex~~ ✅ Fixed (W1)

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

### H2 — ~~`robots.txt` blocks the wrong things~~ ✅ Fixed (W5)

**Location:** `src/app/robots.ts`, `src/lib/supabase/middleware.ts`, public pages that link to profiles

`/profile` was disallowed even though public event, group and impact pages link heavily to `/profile/*`. Blocked URLs that are well linked can be indexed as bare URLs, and a blocked URL's `noindex` is never seen. `/api/` was not disallowed.

**Fix:**
- `robots.ts` disallows `/api/` and no longer disallows `/profile`.
- The proxy sends `X-Robots-Tag: noindex, nofollow` on every `/profile` response. That includes the 307 that anonymous visitors (and crawlers) receive, so the noindex is on the profile URL itself, not only on the sign-in page it redirects to. Signed-in responses also keep the `NOINDEX` metadata from `profile/layout.tsx`.
- Profile links on public pages (`events/[id]` organiser and attendees, `groups/[slug]` members, `impact` top organisers) have `rel="nofollow"`.
- Rule to keep: never disallow a route that relies on `noindex`.

### H3 — ~~The sitemap is incomplete and truncates at 1,000 events~~ ✅ Fixed (W5)

**Location:** `src/app/sitemap.ts`, `src/lib/sitemap.ts`, `src/lib/events.ts`, `src/lib/legal.ts`

The sitemap listed only `/`, `/events` and events. It used one unpaginated query, so PostgREST cut it off at 1,000 rows. It stamped `new Date()` on static pages and dated events from `updated_at`, which the trigger also bumps on system-only writes (stats-reminder and reschedule bookkeeping).

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
- **Stale events:** published events that started more than 14 days ago (`STALE_EVENT_GRACE_DAYS`) were never wrapped up, so they are left out. Completed events stay listed. Drafts and cancelled events stay excluded. Organisers get the stats reminder 12 hours after the start, so 14 days leaves plenty of time to wrap up before an event drops out. The event page itself is `noindex` under the same rule (see M4).
- **Scale:** a single sitemap holds up to 50,000 URLs (`SITEMAP_URL_LIMIT`). The route logs a warning if it goes over. At that point, split it with `generateSitemaps()`. In Next 16 that serves `/sitemap/{id}.xml` with no automatic index, so `robots.ts` would need to list each file.
- The route still renders per request because the Supabase server client reads cookies. That avoids a database dependency at build time and keeps it fresh.
- Unit tests (`src/lib/sitemap.test.ts`) cover coverage, stale-event rules, `lastModified` derivation and the empty-data case.

### H4 — ~~Weak, generic or doubled titles~~ ✅ Fixed (W2)

| Page | Before | After |
|---|---|---|
| `/` | LitterLink | LitterLink — Find Local Litter Picks Near You (absolute) |
| `/events` | Browse Events | Litter Picking Events Near You |
| `/groups` | Browse Groups | Litter Picking Groups Near You |
| `/impact` | Impact | UK Litter Picking Impact |
| `/terms` | Terms & Conditions — LitterLink \| LitterLink | Terms & Conditions \| LitterLink |
| `/profile` | Your Profile — LitterLink \| LitterLink | Your Profile \| LitterLink |
| `/profile/[id]` | {name} — LitterLink \| LitterLink | {name} \| LitterLink |

### H5 — ~~Event and group metadata incomplete~~ ✅ Fixed (W2/W4)

**Location:** `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx`

**Done:**
- Event titles are now `{title} – {district}, {Sat 12 Oct 2026}`.
- Group titles are now `{name} – Litter Picking Group`.
- Descriptions go through `metaDescription()`, which collapses whitespace and cuts on a word boundary at about 155 characters. Fallbacks are more informative.
- Both pages have a canonical and full Open Graph URL, title and description.
- Event and group pages have generated share images (see H6).
- `getEventById` and `getGroupBySlug` are wrapped in React `cache()`, so `generateMetadata` and the page share one query per request.
  - The share image is a separate HTTP request, so it still runs its own query.

**Done — event place name (16 October 2026):**
- **Cause (found during W4):** `events_with_counts` lists its columns explicitly (migration `0024`) and was never rebuilt after `0031` added `location_outcode` and `location_admin_district`.
  - As a result, `{district}` in event titles always fell back to the postcode, even though the TypeScript type includes both fields.
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

### H6 — ~~No share images or X card metadata~~ ✅ Fixed (W4)

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
  - The `?<hash>` in the image URL Next generates is a build hash, not the event content. Platforms that cache by URL (Facebook, X, LinkedIn) need a re-scrape after major edits.

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
- `getGroupBySlug` is now wrapped in React `cache()` (see H5).
- `share-image.test.ts` covers the full card, the postcode fallback, the missing-location case, the unknown-type fallback and long location names.
- Checked visually with a short name ("Batchwood Pickers") and a 63-character, three-line name.

### H7 — ~~No structured data~~ ✅ Fixed (W6)

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

**Not covered:** listing pages (`/events`, `/groups`) carry no `ItemList` or breadcrumbs, and group pages don't list their events. Google only shows event rich results from each event's own page, so these add little.

### H8 — ~~Renaming a group broke its URL~~ ✅ Fixed (W3)

**Location:** `src/app/groups/[slug]/edit/actions.ts`, `src/app/groups/[slug]/page.tsx`

Renaming a group regenerated its slug, and the old URL returned 404.

**Resolution:**
- Migration `0037_group_slug_history.sql` adds a `group_slug_history` table (public read via RLS). It has been applied.
- A `SECURITY DEFINER` trigger, `on_group_slug_change`, records the old slug on rename. It also deletes any history row whose slug is taken by a live group, so a live group always takes priority.
- `getCurrentSlugForOldGroupSlug()` in `src/lib/events.ts` resolves old slugs, and the group page calls `permanentRedirect()` (308) to the current slug.
- Types are added to `src/types/database.ts`.

**Not covered:** `/groups/{old-slug}/edit` still returns 404 (owner-only page, low impact).

### H9 — ~~`/events` duplicates and a short crawl window~~ ✅ Fixed (W3, W7)

**Location:** `src/app/events/(browse)/page.tsx`, `src/lib/search-params.ts`, `src/lib/events.ts`

**Done:**
- Disabled Previous/Next buttons now render as `<span aria-disabled>` through the new `src/components/PaginationLink.tsx`. URLs such as `?page=0` or one past the last page are no longer generated.
- Every `postcode`, `radius`, `from`, `to`, `page`, `pastPage` or `laterPage` variant is `noindex, follow`.
- The bare `/events` page has a "Coming up later" section listing published events after the default 7-day window (`DEFAULT_EVENT_RANGE_DAYS`), 10 per page, as plain links. `getLaterEvents()` paginates in the database with an exact count, so each request reads at most 10 rows from `events_with_counts` and runs in parallel with the main query. Filtered searches (`postcode`, `from`, `to`) skip it.

### H10 — ~~`/impact` had 256 duplicate URL combinations~~ ✅ Fixed (W3)

**Location:** `src/app/impact/page.tsx`

`/impact` has four period parameters with four values each, all linked from the page.

**Resolution:** `generateMetadata` now gives the bare `/impact` a canonical and makes any variant with `orgPeriod`, `areaPeriod`, `statsPeriod` or `groupPeriod` `noindex, follow`.

---

## Medium priority

### M1 — Internal linking — Open (W7)

- Event and impact pages link organisers to `/profile/*`, which requires sign-in, so crawlers hit a dead end. Use `rel="nofollow"` or decide to make organiser pages public.
- The homepage body has no event or group links. Add "Upcoming near you" and "Featured groups" sections.
- ~~Event pages don't link to more events from the same group or nearby.~~ Done: the sidebar on `/events/[id]` shows "Other events nearby" (closest upcoming event within 10 km) and "More from this organiser" (the organiser's or group's next upcoming event). Each section is omitted when there is nothing to show. See `getRelatedEvents()` in `src/lib/events.ts`.
- The "Top areas" on `/impact` are plain text.
- `/events` and `/groups` don't link to each other except through the nav and footer.

### M2 — ~~Heading structure~~ ✅ Fixed (W7)

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

### M3 — ~~Image SEO~~ ✅ Fixed (W7/W8)

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

### M4 — ~~Thin past events~~ ✅ Fixed (W5, W7)

**Location:** `src/lib/sitemap.ts`, `src/app/events/[id]/page.tsx`

Past `published` events that were never wrapped up only say "This event has finished".

**Resolution:**
- **Sitemap (W5):** they are left out 14 days after they start (`isSitemapEvent()`).
- **Event page (W7):** `generateMetadata` passes `indexable: !isStaleEvent(event, new Date())` to `pageMetadata()`, so a stale event is `noindex, follow` with no canonical. `isStaleEvent()` and `isSitemapEvent()` share one grace-period check (`STALE_EVENT_GRACE_DAYS`), so the page and the sitemap can't drift.
- **Cancelled events stay indexable.** Their page carries `EventCancelled` structured data (H7), which Google can only use while the page can be indexed. They are still left out of the sitemap. Completed events are never stale.
- The page is rendered per request, so an event flips to `noindex` on its own once the 14 days pass. Logging stats before then (status `completed`) keeps it indexable.

**Verified** on a local production build, using a Googlebot user agent: three published events that started 20 days to 7 weeks ago return `<meta name="robots" content="noindex, follow"/>` with no canonical, and are absent from `sitemap.xml`. Upcoming events return a canonical and no robots tag.

Unit tests (`src/lib/sitemap.test.ts`) cover `isStaleEvent()`, including agreement with `isSitemapEvent()`.

### M5 — ~~Language and locale~~ ✅ Fixed (W2)

`<html lang="en-GB">` and `openGraph.locale: "en_GB"`.

### M6 — ~~Beta banner hydration mismatch / CLS~~ ✅ Fixed (W8)

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

**Note:** while the banner is enabled, dismissing it sets a first-party session cookie. It holds no personal data. The privacy policy's cookie section (section 11) covers essential session technology only and does not mention it. Add a line there if the banner is reactivated.

### M7 — Server response time — Open (W8)

- `Navbar` calls `getUser()` plus a profile query in the root layout on every request, and the proxy also calls `getUser()`.
- `/events` and `/groups` send every event or group (descriptions included) to the client map component, so page weight grows with the data. Pass a slim pin shape instead.
- The homepage's `getImpactStats` fetches every `event_stats` row, which is also capped at 1,000. Use the existing `national_impact_stats` view.

### M8 — Site URL defined in many places — Partially fixed (W2)

**Done:** `SITE_URL` / `absoluteUrl()` in `src/lib/seo.ts` are now used by `layout.tsx`, `robots.ts`, `sitemap.ts`, `proxy.ts` and `events/[id]/page.tsx`.

**Open:** `src/app/(auth)/actions.ts` and `src/lib/email.ts` still inline `process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk"`.

### M9 — The proxy runs on `robots.txt` and `sitemap.xml` — Open (W8, low)

Both go through the Supabase session refresh. Exclude `robots.txt|sitemap.xml|manifest.webmanifest` from the proxy matcher.

---

## Already implemented correctly (before this audit)

- `metadataBase` and a `%s | LitterLink` title template in the root layout.
- Per-page metadata on most routes; `generateMetadata` with awaited `params` on event and group detail pages.
- `robots.ts` and `sitemap.ts` exist; the sitemap excludes drafts and cancelled events (RLS also hides drafts from anonymous users; cancelled event pages stay public and indexable).
- Every private route redirects anonymous visitors, via the proxy (`updateSession`) or an in-page `redirect()`.
- 308 redirect from www to the bare domain; profiles accessed by UUID redirect to the username URL.
- Detail pages call `notFound()` without a `loading.tsx`, so they return real 404s rather than soft 404s.
- Event and group content is server-rendered with real `<Link>` elements; events link to their group and groups link to their events.
- One `<h1>` per key page.
- Logos and avatars use `next/image` with alt text; the navbar logo uses `priority`.
- Leaflet loads lazily inside fixed-height wrappers, so maps cause no layout shift.
- `next/font`, Vercel Speed Insights, and file-convention icons and manifest.
- Next 16 automatically serves blocking (non-streamed) metadata to crawlers that can't run JavaScript (`htmlLimitedBots`).

---

## Work completed (W1–W6, part of W7)

### New files

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
| `src/lib/structured-data.ts` (+ test) | JSON-LD builders: `siteOrganizationJsonLd()`, `websiteJsonLd()`, `eventJsonLd()`, `groupOrganizationJsonLd()`, `breadcrumbJsonLd()`, `jsonLdGraph()` (W6) |
| `src/components/JsonLd.tsx` | Renders one `@graph` `<script type="application/ld+json">` through `jsonLd()` (W6) |

### Modified files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Root metadata from `@/lib/seo`; removed `og:url`/`og:title`; `lang="en-GB"`; `twitter: TWITTER_DEFAULTS` (W4) |
| `src/proxy.ts` | Coming-soon handling removed; uses `SITE_URL` |
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
| `src/types/database.ts` | `group_slug_history` table type |
| `src/lib/html.ts` (+ test) | `jsonLd()` serialiser (W6) |
| `src/lib/seo.ts` | `CONTACT_EMAIL`, `SOCIAL_PROFILES`, `SITE_LOGO` (W6) |
| `src/components/layout/Footer.tsx` | Social links and contact email from `@/lib/seo` (W6) |
| `src/app/page.tsx`, `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx` | Render `<JsonLd>` (W6) |
| `AGENTS.md` | Documents `src/lib/seo.ts` and the metadata conventions; `structured-data.ts` and the JSON-LD `dangerouslySetInnerHTML` exception (W6) |
| `src/app/page.tsx` | The "Every bag collected…" sentence is a `<p>`, not an `<h2>` (W7, M2) |
| `src/app/events/(browse)/page.tsx` | Visually hidden "Upcoming litter picks" / "Past litter picks" `<h2>`s above the event cards (W7, M2) |
| `src/app/groups/(browse)/page.tsx` | Visually hidden "All groups" `<h2>` above the card grid (W7, M2) |
| `src/components/groups/GroupCard.tsx`, `FeaturedGroupCard.tsx` | Group name wrapped in an `<h3>` / `<h2>` (W7, M2) |
| `src/app/groups/[slug]/page.tsx` | Share button moved out of the `<h1>`; member-chip avatars `alt=""` (W7, M2/M3) |
| `src/app/impact/ImpactHero.tsx` | Keyword-bearing H1 subtitle (W7, M2) |
| `src/components/events/EventPhotosGallery.tsx` | `next/image` with `sizes`; per-photo alt text from the new `eventTitle` prop (W7, M3) |
| `src/app/events/[id]/page.tsx` | Passes `eventTitle` to `EventPhotosGallery` (W7, M3) |
| `src/app/events/[id]/page.tsx` | `generateMetadata` sets `indexable: false` for stale events via `isStaleEvent()` (W7, M4) |

### Conventions for new pages

- **Public, indexable page:** export `metadata = pageMetadata({ title, description, path })`.
- **Listing page with filters or pagination:** use `generateMetadata({ searchParams })` and pass `indexable: !hasListingParams(params, [...filterKeys])`.
- **Private or account page:** set `robots: NOINDEX`, ideally in the section's layout.
- **Never** put `alternates` or `openGraph.url` / `openGraph.title` in the root layout; child pages inherit them.
- **Share images:** `pageMetadata()` includes `DEFAULT_SHARE_IMAGE` through `OPEN_GRAPH_DEFAULTS`. If you build `openGraph` by hand, spread `OPEN_GRAPH_DEFAULTS` so the image is kept. Don't set `twitter.images`; X inherits the Open Graph image.
- **Generated share images:** add `opengraph-image.tsx` beside the page, render with `renderShareImage()` from `@/lib/share-image-render`, and pass `defaultImage: false` to `pageMetadata()`. Otherwise the default image wins over the file.
- Don't include "LitterLink" in page titles; the root template adds it.
- **Structured data:** build nodes with `@/lib/structured-data` and render them with `<JsonLd nodes={[...]} />`. Never write an `application/ld+json` script by hand.

### Verification (local production build, Googlebot user agent)

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

## Outstanding recommendations — proposed order

1. ~~**W4 – Share metadata.**~~ ✅ Done:
   - ~~Root `opengraph-image.png`.~~ Done.
   - ~~`twitter` card in the root layout.~~ Done.
   - ~~Dynamic `opengraph-image.tsx` for events and groups.~~ Done (see H6).
   - ~~`cache()` around `getEventById` and `getGroupBySlug`.~~ Done.
   - ~~Expose `location_outcode` and `location_admin_district` in `events_with_counts`.~~ Done in migration `0038`, now applied (see H5).
2. ~~**W5 – Sitemap and robots:**~~ ✅ Done:
   - ~~Add groups, `/groups`, `/impact` and the legal pages.~~ Done (see H3).
   - ~~`.range()` pagination; real `lastModified`; drop stale, never-wrapped-up events.~~ Done (see H3 and M4).
   - ~~Disallow `/api/`; resolve the `/profile` disallow (H2).~~ Done.
3. ~~**W6 – JSON-LD:**~~ ✅ Done (see H7):
   - ~~`jsonLd()` serialiser with tests.~~ Done.
   - ~~`Organization` / `WebSite` on the homepage, `Event` on event pages, `Organization` on group pages, `BreadcrumbList` on detail pages.~~ Done.
   - ~~Document the exception in AGENTS.md.~~ Done.
4. **W7 – Linking and content:**
   - Homepage event and group sections. ~~Related or nearby events on event pages.~~ Done (see M1).
   - ~~Decide on profile links (public pages or `nofollow`).~~ `nofollow` (H2).
   - ~~Heading fixes (M2) and photo alt text (M3).~~ Done.
   - ~~Upcoming list beyond 7 days (H9).~~ Done.
   - ~~Remove `?back=` from card links.~~ Done (see C4).
5. **W8 – Core Web Vitals:**
   - ~~Fix the beta banner hydration/CLS (M6).~~ Done.
   - Slim map props; ~~`next/image` in the gallery~~ (done with M3).
   - Homepage stats from `national_impact_stats`; proxy matcher exclusions (M9).
6. **Tidy-ups:**
   - Move the remaining inline site URLs in `(auth)/actions.ts` and `email.ts` to `SITE_URL` (M8).
   - ~~Thin-event `noindex` on the page itself (M4).~~ Done.

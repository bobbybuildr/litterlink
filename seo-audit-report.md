# LitterLink — Technical SEO Audit

**Date:** 4 October 2026
**Scope:** Technical SEO across `src/app/`, `src/components/`, `src/lib/`, `src/proxy.ts`, `robots.ts`, `sitemap.ts`, metadata and routing. Next.js 16 behaviour was checked against the installed docs in `node_modules/next/dist/docs/`.
**Public routes in scope:** `/`, `/events`, `/events/[id]`, `/groups`, `/groups/[slug]`, `/impact`, `/privacy`, `/terms`
**Status:** W1–W3 implemented. `npm test` (166 tests), `npm run typecheck`, `npm run lint` and `npm run build` all pass. Rendered `<head>` output was verified against a local production build using a Googlebot user agent.

## Summary

The basics were already sound. Event and group content is server-rendered with real links. Detail pages return genuine 404s. Private routes redirect anonymous visitors. `robots.ts`, `sitemap.ts` and a title template were already in place.

The serious gaps were about **indexing control and duplication**:

- Auth pages and the postcode filter could be indexed while echoing arbitrary text from the URL.
- Every page inherited the homepage's `og:url` and `og:title` from the root layout.
- No page had a canonical URL.
- Coming-soon mode only hid part of the site. (The mode has since been removed entirely; see C5.)

All critical issues are now fixed. The remaining work is mainly enhancement: share images, structured data, sitemap coverage, internal linking and performance.

| Severity | Total | Fixed | Partially fixed | Open |
|---|---|---|---|---|
| Critical | 5 | 5 | 0 | 0 |
| High | 10 | 5 | 3 | 2 |
| Medium | 9 | 1 | 1 | 7 |

### Workstreams

| ID | Workstream | Status |
|---|---|---|
| W1 | Indexing controls | ✅ Done |
| W2 | Titles and shared metadata | ✅ Done |
| W3 | Canonical URLs and query-parameter duplicates | ✅ Done |
| W4 | Open Graph, X and share images | Open |
| W5 | Sitemap and robots | In progress (robots done) |
| W6 | Structured data (JSON-LD) | Open |
| W7 | Internal linking, content and headings | Open |
| W8 | Core Web Vitals | Open |

---

## Deployment notes

1. **Apply migration `0037_group_slug_history.sql`** (`supabase db push`). Until it is applied, the old-slug lookup finds nothing and renamed groups return 404 as before; nothing errors.
2. **Remove the `COMING_SOON` environment variable** from the hosting provider. Nothing reads it any more.
3. After deploying, check the following in Google Search Console:
   - Submit `sitemap.xml`.
   - Use URL Inspection on `/`, an event page and a group page.
   - Look in the Pages report for "Duplicate without user-selected canonical" and "Indexed, though blocked by robots.txt".

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
- The event canonical ignores `?back=`.
- Filtered and paginated listing variants get `noindex, follow` *without* a canonical, because Google advises against combining the two. Unrelated parameters such as `?flash=` and `utm_*` keep the canonical.

**Still open (optional, W7):** event card links could drop `?back=` altogether and restore the list state another way, e.g. `sessionStorage`.

### C5 — ~~Coming-soon mode only partly hid the site~~ ✅ Removed

**Location:** `src/proxy.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/coming-soon/page.tsx`

Only `/`, `/events` and `/events/*` redirected. Groups, impact, auth and legal pages stayed indexable, and the sitemap kept listing URLs that redirected.

**Resolution:** the site has launched, so coming-soon mode has been removed entirely:
- The `/coming-soon` route is deleted (it now returns 404; it was always `noindex`, so nothing indexed is lost).
- `isComingSoon()` and the `COMING_SOON` flag are gone.
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

### H3 — The sitemap is incomplete and truncates at 1,000 events — Partially fixed (W5)

**Location:** `src/app/sitemap.ts`

Still outstanding:
- Add `/groups`, `/groups/{slug}`, `/impact`, `/privacy` and `/terms`.
- Paginate the event query with `.range()` (PostgREST caps responses at 1,000 rows).
- Stop reporting `lastModified: new Date()` for static pages.
- Consider leaving out stale past events that were never wrapped up.
- Plan for `generateSitemaps()` beyond about 50k URLs.

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

### H5 — Event and group metadata incomplete — Partially fixed (W2 done, W4 open)

**Location:** `src/app/events/[id]/page.tsx`, `src/app/groups/[slug]/page.tsx`

**Done:**
- Event titles are now `{title} – {district}, {Sat 12 Oct 2026}`.
- Group titles are now `{name} – Litter Picking Group`.
- Descriptions go through `metaDescription()`, which collapses whitespace and cuts on a word boundary at about 155 characters. Fallbacks are more informative.
- Both pages have a canonical and full Open Graph URL, title and description.

**Open (W4):**
- Share images.
- Wrap `getEventById` and `getGroupBySlug` in React `cache()`. Both are currently called twice per request, once by `generateMetadata` and once by the page.

### H6 — No share images or X card metadata — Open (W4)

**Location:** `src/app/layout.tsx`; there is no `opengraph-image.*` or `twitter-image.*` file anywhere.

**Recommendation:**
- Add `src/app/opengraph-image.png` (1200×630).
- Add `twitter: { card: "summary_large_image", site: "@litterlink_" }` to the root layout.
- Add dynamic `opengraph-image.tsx` files for `events/[id]` and `groups/[slug]` using `ImageResponse`.
- A page that sets `openGraph` replaces the whole object, so put the shared image in `OPEN_GRAPH_DEFAULTS` (or spread it in `pageMetadata()`).

### H7 — No structured data — Open (W6)

**Recommendation:**
- **Homepage:** `Organization` (logo, `sameAs` links to Facebook, Instagram and X) and `WebSite`.
- **Event pages:** `Event` with:
  - `startDate` / `endDate`
  - `eventStatus`
  - `eventAttendanceMode: OfflineEventAttendanceMode`
  - `location` as a `Place` with `PostalAddress` (postcode, admin district, GB) and `geo`
  - `organizer` (the group if present, otherwise the organiser)
  - `isAccessibleForFree`
  - attendee capacity
  - `image`
- **Group pages:** `Organization` with `url`, `logo` and `sameAs` (website and social links).
- **Detail pages:** `BreadcrumbList`.

**Security:** AGENTS.md forbids `dangerouslySetInnerHTML` with user data, but JSON-LD requires a script tag. Add a single `jsonLd()` serialiser to `@/lib/html` that escapes `<` as `\u003c` (the Next.js `json-ld.md` guide). Unit-test it and document the exception in AGENTS.md.

### H8 — ~~Renaming a group broke its URL~~ ✅ Fixed (W3)

**Location:** `src/app/groups/[slug]/edit/actions.ts`, `src/app/groups/[slug]/page.tsx`

Renaming a group regenerated its slug, and the old URL returned 404.

**Resolution:**
- Migration `0037_group_slug_history.sql` adds a `group_slug_history` table (public read via RLS).
- A `SECURITY DEFINER` trigger, `on_group_slug_change`, records the old slug on rename. It also deletes any history row whose slug is taken by a live group, so a live group always takes priority.
- `getCurrentSlugForOldGroupSlug()` in `src/lib/events.ts` resolves old slugs, and the group page calls `permanentRedirect()` (308) to the current slug.
- Types are added to `src/types/database.ts`.

**Not covered:** `/groups/{old-slug}/edit` still returns 404 (owner-only page, low impact).

### H9 — `/events` duplicates and a short crawl window — Partially fixed (W3 done, W7 open)

**Location:** `src/app/events/(browse)/page.tsx`, `src/lib/search-params.ts`

**Done:**
- Disabled Previous/Next buttons now render as `<span aria-disabled>` through the new `src/components/PaginationLink.tsx`. URLs such as `?page=0` or one past the last page are no longer generated.
- Every `postcode`, `radius`, `from`, `to`, `page` or `pastPage` variant is `noindex, follow`.

**Open (W7):** the default list only covers the next 7 days (`DEFAULT_EVENT_RANGE_DAYS`). Events further ahead are linked only from group pages and the sitemap. Add a crawlable upcoming-events list that isn't limited to 7 days, e.g. on the homepage or a "later" section.

### H10 — ~~`/impact` had 256 duplicate URL combinations~~ ✅ Fixed (W3)

**Location:** `src/app/impact/page.tsx`

`/impact` has four period parameters with four values each, all linked from the page.

**Resolution:** `generateMetadata` now gives the bare `/impact` a canonical and makes any variant with `orgPeriod`, `areaPeriod`, `statsPeriod` or `groupPeriod` `noindex, follow`.

---

## Medium priority

### M1 — Internal linking — Open (W7)

- Event and impact pages link organisers to `/profile/*`, which requires sign-in, so crawlers hit a dead end. Use `rel="nofollow"` or decide to make organiser pages public.
- The homepage body has no event or group links. Add "Upcoming near you" and "Featured groups" sections.
- Event pages don't link to more events from the same group or nearby.
- The "Top areas" on `/impact` are plain text.
- `/events` and `/groups` don't link to each other except through the nav and footer.

### M2 — Heading structure — Open (W7)

- `src/app/page.tsx` uses an `<h2>` for an ordinary sentence ("Every bag collected helps…").
- On `/events`, `EventCard` uses `<h3>` directly under the `<h1>`, skipping `<h2>`.
- `GroupCard` and `FeaturedGroupCard` have no heading for the group name.
- The group-page `<h1>` contains the share `<button>`.
- The `/impact` H1 ("Real people. Real impact.") has no keywords; add a keyword-bearing subtitle.

### M3 — Image SEO — Open (W7/W8)

- `EventPhotosGallery` uses `alt="Event photo"` on every image. Use `"{event title} litter pick – photo {n}"`.
- It also loads full-size images into 160px tiles with a raw `<img>`. Switch to `next/image` with `sizes`.
- Member-chip avatar alt text on group pages repeats the visible name; set it to `""`.

### M4 — Thin past events — Open (W2/W5)

Past `published` events that were never wrapped up only say "This event has finished". Consider `noindex` after N days without stats, and leaving them out of the sitemap.

### M5 — ~~Language and locale~~ ✅ Fixed (W2)

`<html lang="en-GB">` and `openGraph.locale: "en_GB"`.

### M6 — Beta banner hydration mismatch / CLS — Open (W8)

**Location:** `src/components/layout/BetaBanner.tsx`

It reads `sessionStorage` during render. The server renders the banner and the client renders nothing, which causes a hydration mismatch and a layout shift at the top of every page for users who dismissed it.

**Recommendation:** read the value in an effect, or use a cookie read on the server.

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
- `robots.ts` and `sitemap.ts` exist; the sitemap excludes drafts and cancelled events (RLS also hides them from anonymous users).
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

## Work completed (W1–W3)

### New files

| File | Purpose |
|---|---|
| `src/lib/seo.ts` | `SITE_URL`, `SITE_NAME`, `DEFAULT_DESCRIPTION`, `OPEN_GRAPH_DEFAULTS`, `NOINDEX`, `NOINDEX_FOLLOW`, `absoluteUrl()`, `metaDescription()`, `hasListingParams()`, `pageMetadata()` |
| `src/lib/seo.test.ts` | Tests for URL building, description truncation, listing-parameter detection and `pageMetadata()` output |
| `src/components/PaginationLink.tsx` | Renders a `<span>` instead of a link when pagination is disabled |
| `src/app/(auth)/layout.tsx` | `noindex, follow` for all auth pages |
| `src/app/dashboard/layout.tsx` | `noindex, nofollow` |
| `src/app/profile/layout.tsx` | `noindex, nofollow` for `/profile` and `/profile/[id]` |
| `supabase/migrations/0037_group_slug_history.sql` | Old-slug history table, RLS, and the maintenance trigger |

### Modified files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Root metadata from `@/lib/seo`; removed `og:url`/`og:title`; `lang="en-GB"` |
| `src/proxy.ts` | Coming-soon handling removed; uses `SITE_URL` |
| `src/app/robots.ts` | Uses `absoluteUrl()`; coming-soon handling removed |
| `src/app/sitemap.ts` | Uses `SITE_URL`; coming-soon handling removed |
| `src/app/coming-soon/page.tsx` | Deleted |
| `src/app/page.tsx` | Homepage `pageMetadata()` with an absolute title and canonical `/` |
| `src/app/events/(browse)/page.tsx` | `generateMetadata` with listing `noindex`; `parsePostcode()`; `PaginationLink` |
| `src/app/groups/(browse)/page.tsx` | Same as `/events` |
| `src/app/impact/page.tsx` | `generateMetadata` with period-parameter `noindex` |
| `src/app/events/[id]/page.tsx` | Descriptive title, trimmed description, canonical, Open Graph; `absoluteUrl()` for the share URL |
| `src/app/groups/[slug]/page.tsx` | Descriptive metadata and canonical; 308 redirect for old slugs |
| `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | `pageMetadata()` with canonicals; fixed the doubled terms title |
| `src/app/(auth)/*/page.tsx` | Distinct titles |
| `src/app/admin/layout.tsx` | `robots: NOINDEX` |
| `events/create`, `events/[id]/edit`, `events/[id]/stats`, `groups/create`, `groups/[slug]/edit`, `become-a-verified-organiser` | `robots: NOINDEX` |
| `src/app/profile/page.tsx`, `src/app/profile/[id]/page.tsx` | Fixed doubled title suffixes |
| `src/lib/search-params.ts` (+ test) | `parsePostcode()` |
| `src/lib/events.ts` | `getCurrentSlugForOldGroupSlug()` |
| `src/types/database.ts` | `group_slug_history` table type |
| `AGENTS.md` | Documents `src/lib/seo.ts` and the metadata conventions |

### Conventions for new pages

- **Public, indexable page:** export `metadata = pageMetadata({ title, description, path })`.
- **Listing page with filters or pagination:** use `generateMetadata({ searchParams })` and pass `indexable: !hasListingParams(params, [...filterKeys])`.
- **Private or account page:** set `robots: NOINDEX`, ideally in the section's layout.
- **Never** put `alternates` or `openGraph.url` / `openGraph.title` in the root layout; child pages inherit them.
- Don't include "LitterLink" in page titles; the root template adds it.

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

---

## Outstanding recommendations — proposed order

1. **W4 – Share metadata:**
   - Root `opengraph-image.png`.
   - `twitter` card in the root layout.
   - Dynamic `opengraph-image.tsx` for events and groups.
   - `cache()` around `getEventById` and `getGroupBySlug`.
2. **W5 – Sitemap and robots:**
   - Add groups, `/groups`, `/impact` and the legal pages.
   - `.range()` pagination; real `lastModified`; drop stale, never-wrapped-up events.
   - ~~Disallow `/api/`; resolve the `/profile` disallow (H2).~~ Done.
3. **W6 – JSON-LD:**
   - `jsonLd()` serialiser with tests.
   - `Organization` / `WebSite` on the homepage, `Event` on event pages, `Organization` on group pages, `BreadcrumbList` on detail pages.
   - Document the exception in AGENTS.md.
4. **W7 – Linking and content:**
   - Homepage event and group sections; related or nearby events on event pages.
   - ~~Decide on profile links (public pages or `nofollow`).~~ `nofollow` (H2).
   - Heading fixes (M2) and photo alt text (M3).
   - Upcoming list beyond 7 days (H9); optionally remove `?back=` from card links.
5. **W8 – Core Web Vitals:**
   - Fix the beta banner hydration/CLS (M6).
   - Slim map props; `next/image` in the gallery.
   - Homepage stats from `national_impact_stats`; proxy matcher exclusions (M9).
6. **Tidy-ups:**
   - Move the remaining inline site URLs in `(auth)/actions.ts` and `email.ts` to `SITE_URL` (M8).
   - Thin-event `noindex` policy (M4).

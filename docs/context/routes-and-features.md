# LitterLink — Routes & Feature Status

---

## Route Map

All routes use the Next.js 16 App Router. There is no Pages Router.

### Public Routes

| Route | Component | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing / home page |
| `/coming-soon` | `src/app/coming-soon/page.tsx` | Pre-launch holding page — all traffic redirected here when `COMING_SOON=true` |
| `/events` | `src/app/events/page.tsx` | Browse all published events — postcode search, radius filter, date range, map + card list |
| `/events/[id]` | `src/app/events/[id]/page.tsx` | Event detail — join/leave, share URL, map pin, post-event impact stats |

### Auth Routes

| Route | Component | Description |
|---|---|---|
| `/sign-in` | `src/app/(auth)/sign-in/page.tsx` | Email/password sign-in form + Google OAuth button |
| `/sign-up` | `src/app/(auth)/sign-up/page.tsx` | Email/password registration form |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth redirect handler — exchanges code for session then redirects |

### Protected Routes (redirect to `/sign-in` if unauthenticated)

| Route | Component | Description |
|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | Personal dashboard — upcoming/past joined events, organised events, impact totals |
| `/profile` | `src/app/profile/page.tsx` | Edit display name, postcode, avatar |
| `/events/create` | `src/app/events/create/page.tsx` | Create a new litter-pick event |
| `/events/[id]/stats` | `src/app/events/[id]/stats/page.tsx` | Log post-event impact data (organiser only — returns 404 for other users) |

### Server Actions

| File | Exported Actions | Used By |
|---|---|---|
| `src/app/(auth)/actions.ts` | `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `signOut` | Sign-in / sign-up pages, `SignOutButton` |
| `src/app/events/actions.ts` | `joinEvent`, `leaveEvent`, `cancelEvent` | `JoinButton` component, event detail page |
| `src/app/events/create/actions.ts` | `createEvent` | Create event page |
| `src/app/events/[id]/stats/actions.ts` | `submitStats` | Stats page |
| `src/app/profile/actions.ts` | `updateProfile` | `ProfileForm` |

### Route Protection Logic

Enforced in `src/proxy.ts` (Next.js 16 middleware replacement):

- `COMING_SOON=true` → all routes redirect to `/coming-soon` except `/auth/*` and `/coming-soon` itself
- Unauthenticated users visiting `/dashboard`, `/events/create`, or `/profile` → redirect to `/sign-in?redirectTo=…`
- Authenticated users visiting `/sign-in` or `/sign-up` → redirect to `/dashboard`

### Search Parameters — `/events`

| Param | Type | Default | Description |
|---|---|---|---|
| `postcode` | string | — | UK postcode to centre the search |
| `radius` | number (km) | 16 | Search radius |
| `from` | ISO date string | today | Events starting from |
| `to` | ISO date string | today + 7 days | Events starting before |

### Navigation Structure

```
Navbar
├── Logo → /
├── Events → /events
├── + Create event (authenticated only) → /events/create
└── Avatar dropdown (authenticated) / Sign in button (unauthenticated)
    ├── Dashboard → /dashboard
    └── Sign out

Footer
├── Browse events → /events
└── Host an event → /events/create
```

---

## Feature Status

### Built & Shipped (MVP)

#### Authentication
- Email/password sign-up with email confirmation
- Google OAuth sign-in
- Auto profile creation on sign-up (via Supabase DB trigger)
- Session refresh on every request via `src/proxy.ts`
- Route protection (unauthenticated redirect to `/sign-in`)

#### Events
- Create a new litter-pick event with title, description, UK postcode (geocoded to lat/lng), address label, start/end times, and max attendees
- Organiser can optionally auto-join their own event at creation time
- Events default to `published` status on creation
- Organiser can cancel an event (status → `cancelled`)
- Event detail page with full info, participant count, map pin, and share URL

#### Discovery & Map
- Browse all published/completed events at `/events`
- Postcode-based geo search with configurable radius (5/10/25/50 mi)
- Date range filtering
- Interactive Leaflet map showing all matching events with popups
- Card list alongside the map

#### Joining
- Authenticated users can join and leave events
- Real-time participant count updates via Supabase Realtime (postgres_changes subscription)
- Unauthenticated users redirected to sign-in when attempting to join

#### Post-Event Impact Logging
Organiser-only form at `/events/[id]/stats`:
- Bags collected
- Actual attendees
- Duration (hours)
- Litter types (checkbox selection)
- Hotspot severity (1–5 scale)
- Notable brands found
- General notes
- Submitting sets event status to `completed`

#### Dashboard
- Personal impact totals (bags collected from attended completed events)
- Upcoming confirmed events
- Past attended events
- All organised events
- Quick links to profile and create event

#### Profile
- Edit display name, home postcode
- Upload avatar (JPEG/PNG/WebP, ≤ 5 MB) stored in Supabase Storage
- Avatar shown in navbar

#### Infrastructure
- Pre-launch coming-soon gate (toggled via `COMING_SOON` env var)
- Vercel Analytics and Speed Insights integrated
- Row-Level Security on all tables
- PWA manifest (`src/app/manifest.ts`)

---

### Not Yet Built

The following features are absent from the codebase. Do not assume these exist when suggesting code.

#### Communication
- Email notifications (event reminders, new events near user, join confirmations)
- Push notifications / browser notifications
- In-app messaging or comments on events

#### Social / Community
- Comment or discussion threads on event pages
- Public organiser profile pages
- Following organisers or areas
- Volunteer reputation / badges

#### Discovery
- "Events near me" using browser geolocation (currently requires manual postcode entry)
- Saved/bookmarked events
- Search by event title or keyword
- Category/tag filtering (beach, park, street, etc.)

#### Organiser Tools
- Edit an existing event (only cancel is currently available)
- Waitlist management
- Attendee list visible to organiser
- Co-organiser / team support
- Recurring event scheduling

#### Photos
- `event_photos` table and storage bucket exist in the schema, but no UI for uploading or viewing event photos is implemented

#### Impact & Stats
- Public leaderboard or aggregate community impact statistics
- `weight_kg` and `area_covered_sqm` columns exist in the original SQL migration but are not in the TypeScript types or any UI — effectively unused
- Downloadable impact reports

#### Admin / Moderation
- No admin panel or moderation tooling
- No event flagging or reporting mechanism

#### SEO & Sharing
- Open Graph / Twitter Card meta tags not implemented
- No structured data (JSON-LD) for events
- No sitemap

#### Other
- No test suite (unit, integration, or e2e)
- No email template system
- No paid/premium tier or monetisation
- PWA service worker not implemented (manifest exists, offline support does not)

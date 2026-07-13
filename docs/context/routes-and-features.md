# LitterLink — Routes & Feature Status

---

## Route Map

All routes use the Next.js 16 App Router. There is no Pages Router.

### Public Routes

| Route | Component | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing / home page |
| `/coming-soon` | `src/app/coming-soon/page.tsx` | Pre-launch holding page — `/`, `/events`, and `/events/*` redirect here when `COMING_SOON=true` |
| `/events` | `src/app/events/page.tsx` | Browse all published events — postcode search, radius filter, date range, map + card list |
| `/events/[id]` | `src/app/events/[id]/page.tsx` | Event detail — join/leave, share URL, map pin, photo gallery, participants, post-event stats |
| `/groups` | `src/app/groups/page.tsx` | Browse all groups — postcode search, radius filter, group type filter, interactive map with popups, "Featured Group" showcase (most active in the trailing 30 days, hidden once a search/filter is applied), and a card grid sorted by member count |
| `/groups/[slug]` | `src/app/groups/[slug]/page.tsx` | Group profile page — logo, description, links, member count, join/leave button, impact stats (events hosted, bags collected, volunteer sessions, hours volunteered), organisers section, members section, upcoming/past events |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy policy |
| `/terms` | `src/app/terms/page.tsx` | Terms of service |

### Auth Routes

| Route | Component | Description |
|---|---|---|
| `/sign-in` | `src/app/(auth)/sign-in/page.tsx` | Email/password sign-in form + Google OAuth button |
| `/sign-up` | `src/app/(auth)/sign-up/page.tsx` | Email/password registration form (includes email preference opt-ins) |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Request a password-reset email |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Set a new password (after clicking the emailed link) |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth redirect handler — exchanges code for session then redirects |

### Protected Routes (redirect to `/sign-in` if unauthenticated)

| Route | Component | Description |
|---|---|---|
| `/dashboard` | `src/app/dashboard/page.tsx` | Personal dashboard — upcoming/past joined events, organised events, groups, verified-organiser badge |
| `/profile` | `src/app/profile/page.tsx` | Edit display name, postcode, avatar, email preferences; delete account |
| `/events/create` | `src/app/events/create/page.tsx` | Create a new litter-pick event (requires auth; verified organisers can link a group) |
| `/events/[id]/edit` | `src/app/events/[id]/edit/page.tsx` | Edit a published event — title, description, date/time, location, capacity, contact details (organiser only; redirects to event detail if started/completed/cancelled) |
| `/events/[id]/stats` | `src/app/events/[id]/stats/page.tsx` | Log post-event impact data (organiser only — returns 404 for other users) |
| `/become-a-verified-organiser` | `src/app/become-a-verified-organiser/page.tsx` | Apply for verified-organiser status; shows existing application status |
| `/groups/create` | `src/app/groups/create/page.tsx` | Create a new group (verified organisers only) |
| `/groups/[slug]/edit` | `src/app/groups/[slug]/edit/page.tsx` | Edit a group profile — name, description, type, links, contact email, and logo (group owner only) |

### Admin Routes (redirect to `/dashboard` if not `is_admin`)

| Route | Component | Description |
|---|---|---|
| `/admin` | `src/app/admin/page.tsx` | Redirects to `/admin/applications` |
| `/admin/applications` | `src/app/admin/applications/page.tsx` | Review, approve, and reject verified-organiser applications |

### Server Actions

| File | Exported Actions | Used By |
|---|---|---|
| `src/app/(auth)/actions.ts` | `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `signOut` | Sign-in / sign-up pages, `SignOutButton` |
| `src/app/events/actions.ts` | `joinEvent`, `leaveEvent`, `cancelEvent` | `JoinButton` component, event detail page |
| `src/app/events/[id]/edit/actions.ts` | `updateEvent` | Edit event page |
| `src/app/events/create/actions.ts` | `createEvent` | Create event page |
| `src/app/events/[id]/stats/actions.ts` | `submitStats` | Stats page |
| `src/app/profile/actions.ts` | `updateProfile`, `deleteAccount` | `ProfileForm`, `DeleteAccountSection` |
| `src/app/become-a-verified-organiser/actions.ts` | `submitOrganiserApplication` | `ApplicationForm` |
| `src/app/admin/applications/actions.ts` | `approveApplication`, `rejectApplication` | `ApproveButton`, `RejectButton` |
| `src/app/groups/create/actions.ts` | `createGroup` | Create group page |
| `src/app/groups/[slug]/edit/actions.ts` | `updateGroup` | Edit group page |
| `src/app/groups/actions.ts` | `joinGroup`, `leaveGroup`, `deleteGroup` | `JoinGroupButton`, `DeleteGroupButton` components |

### Route Protection Logic

Enforced in `src/proxy.ts` (Next.js 16 middleware replacement):

- `COMING_SOON=true` → only `/`, `/events`, and `/events/*` redirect to `/coming-soon`; all other routes (auth, admin, etc.) remain accessible
- Unauthenticated users visiting `/dashboard`, `/events/create`, `/events/[id]/edit`, or `/profile` → redirect to `/sign-in?redirectTo=…`
- Authenticated users visiting `/sign-in` or `/sign-up` → redirect to `/dashboard`
- Admin gate for `/admin/*` is enforced in `src/app/admin/layout.tsx` (checks `profiles.is_admin`)

### Search Parameters — `/events`

| Param | Type | Default | Description |
|---|---|---|---|
| `postcode` | string | — | UK postcode to centre the search |
| `radius` | number (km) | 16 | Search radius |
| `from` | ISO date string | today | Events starting from |
| `to` | ISO date string | today + 7 days | Events starting before |

### Search Parameters — `/groups`

| Param | Type | Default | Description |
|---|---|---|---|
| `postcode` | string | — | UK postcode to centre the search |
| `radius` | number (km) | 16 | Search radius |
| `type` | string | — | Filter by `group_type` (`community` \| `school` \| `corporate` \| `council` \| `charity` \| `other`) |
| `page` | number | 1 | Pagination for the card list |

When `postcode` or `type` is set, the "Featured Group" card is hidden (only shown on the unfiltered default view).

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

### Built & Shipped

#### Authentication
- Email/password sign-up with email confirmation; email preferences captured at sign-up (stored in `raw_user_meta_data`, applied on callback)
- Google OAuth sign-in
- Password reset flow (forgot-password → email link → reset-password)
- Auto profile creation on sign-up (via Supabase DB trigger)
- Auto email-preferences row creation on profile creation (via DB trigger)
- Session refresh on every request via `src/proxy.ts`
- Route protection (unauthenticated redirect to `/sign-in`)

#### Events
- Create a new litter-pick event with title, description, UK postcode (geocoded to lat/lng), address label, start/end times, max attendees, optional organiser contact details, and optional group affiliation
- Rate-limited event creation (5 per user per 24 hours — `src/lib/ratelimit.ts`)
- Input sanitization via `src/lib/sanitize.ts` (strips HTML tags)
- Events default to `published` status on creation
- Organiser can cancel an event (status → `cancelled`)
- Event detail page with full info, participant count, map pin, share URL, photo gallery (completed events), and participant list
- Verified organiser badge shown on event cards and detail pages
- Open Graph meta tags on event detail pages

#### Discovery & Map
- Browse all published/completed events at `/events`
- Postcode-based geo search with configurable radius
- Date range filtering
- Interactive Leaflet map showing all matching events with popups
- Card list alongside the map

#### Joining
- Authenticated users can join and leave events
- Real-time participant count updates via Supabase Realtime (postgres_changes subscription)
- Race-condition-safe capacity enforcement via a DB trigger (`enforce_event_capacity`) that raises `P0001/event_full`
- Rate-limited join attempts (20 per user per hour)
- Unauthenticated users redirected to sign-in when attempting to join
- Email confirmation sent to user on join; notification to organiser; email on leave or cancellation

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
- Upcoming confirmed events (joined)
- Past attended events
- All organised events
- Groups created by the user
- Verified-organiser badge and prompt to apply if not yet verified
- Quick links to profile and create event

#### Profile
- Edit display name, home postcode
- Upload avatar (JPEG/PNG/WebP, ≤ 5 MB) stored in Supabase Storage
- Avatar shown in navbar
- Email preference management (transactional and marketing opt-ins)
- Account deletion — removes personal data, sets FK to null on events/groups, deletes auth user

#### Photos
- Completed events show a photo gallery (`EventPhotosGallery`)
- Participants can upload photos to completed events (`PhotoUpload` component, stored in `event-photos` bucket)

#### Verified Organiser System
- Any user can apply at `/become-a-verified-organiser`
- Application collects motivation, experience, organisation name, and social links
- Admin is notified by email on submission; applicant receives a confirmation email
- Admins can approve or reject at `/admin/applications`
- Approval email sent to applicant; `profiles.is_verified_organiser` set to `true`
- Verified badge displayed on events and group pages

#### Groups
- Verified organisers can create groups at `/groups/create` (name, description, type, logo, postcode/display location, website, social, contact email) — creator receives a confirmation email with a shareable group link (`sendGroupCreatedEmail`)
- `/groups` discovery page — mirrors the `/events` layout:
  - Postcode + radius search and group-type filter (`GroupsFilter`)
  - Interactive Leaflet map of all matching groups with popups showing name, type, location, member count, and upcoming event count (`GroupsMap`)
  - "Featured Group" showcase card (`FeaturedGroupCard`) — the group with the highest recent-activity score (new members, events held, and participants joined in the trailing 30 days, weighted and computed in `getPublishedGroups`/`getFeaturedGroup` in `src/lib/events.ts`); only shown when no postcode/type filter is applied
  - Card grid (`GroupCard`) — logo, name, verified badge, type, location, member count, upcoming event count, description, and a "View" button; sorted by member count descending; paginated
- Group profile page at `/groups/[slug]` — shows logo, type, description, links, member count, join/leave button, impact stats (events hosted, bags collected, volunteer sessions, hours volunteered — aggregated from `event_stats` for the group's completed events), organisers section, members section (with avatar chips linking to profiles), and upcoming/past events
- Group owners can edit groups at `/groups/[slug]/edit` — updates name, slug, description, type, website/social/contact details, and logo changes are published immediately
- Group owners or admins can permanently delete a group (`deleteGroup` action, `DeleteGroupButton`) — removes the logo from Storage, cascades to `group_members`, and sets `events.group_id` to `NULL` on affiliated events (event history is preserved)
- Groups can be affiliated with events at creation time
- Group name and slug appear on `EventCard` and event detail
- Groups are joinable — `group_members` table with `role` (`'member'` \| `'organiser'`)
- `JoinGroupButton` (`src/components/groups/JoinGroupButton.tsx`) — optimistic join/leave toggle; unauthenticated users redirected to sign-in
- Creator is automatically enrolled as `'organiser'` on group creation
- Creators cannot leave their own group — enforced at application layer and by a DB trigger (`enforce_creator_cannot_leave`)
- Self-insert RLS policy restricts `role` to `'member'` only — prevents API-level self-promotion to organiser
- Rate-limited group joins (10 per user per hour — `isGroupJoinRateLimited` in `src/lib/ratelimit.ts`)
- Shared `GROUP_TYPE_LABELS` constant lives in `src/lib/constants.ts` (client-safe — no server-only imports) so both Server and Client Components can use it without pulling in the Supabase server client

#### Email Notifications (via Resend, `src/lib/email.ts`)
- Organiser application submitted → admin notification + applicant confirmation
- Application approved/rejected → outcome email to applicant
- Event created → confirmation email to organiser (`sendEventCreatedEmail`)
- Event joined → confirmation email to participant
- Event left → notification email
- Event cancelled → notification to all confirmed participants
- Event date/time or location changed → notification to all confirmed participants (`sendEventUpdatedEmails`); rate-limited to once per 15 minutes per event (tracked via `events.reschedule_notified_at`)
- Group created → confirmation email to creator with a shareable group link, encouraging them to invite others to join (`sendGroupCreatedEmail`)
- In-process rate limiting (60-second cooldown per key) to prevent burst sends

#### Admin Panel
- `/admin/applications` — list all organiser applications (pending + reviewed)
- Approve/reject with one click; triggers email and profile update
- Access gated by `profiles.is_admin = true` (set manually in DB)

#### Infrastructure
- Pre-launch coming-soon gate (toggled via `COMING_SOON` env var; scoped to home and events routes)
- Vercel Analytics and Speed Insights integrated
- Row-Level Security on all tables
- PWA manifest (`src/app/manifest.ts`)
- Open Graph meta in root layout and event detail pages
- `sitemap.ts` and `robots.ts` present
- Supabase Edge Function `send-event-reminders` (`supabase/functions/send-event-reminders/`) — Deno function scheduled every 4 hours via pg_cron + pg_net. Finds published events that ended > 12 hours ago with no stats and emails the organiser a reminder to log impact. Sets `events.stats_reminder_sent_at` after sending so the reminder is never repeated.
- Rate limiting for event creation, event joins, and group joins

---

### Not Yet Built

The following features are absent from the codebase. Do not assume these exist when suggesting code.

#### Communication
- Email reminders for upcoming events
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

#### Impact & Stats
- Public leaderboard or aggregate community impact statistics
- `weight_kg` and `area_covered_sqm` columns exist in the schema and TypeScript types but are not exposed in any UI
- Downloadable impact reports

#### Groups
- No group invitation system — membership is purely self-service (join/leave)
- No group-level event creation flow — events are linked to groups at event creation time (no "create event under this group" shortcut from the group page)

#### Admin / Moderation
- No event flagging or reporting mechanism
- No bulk admin actions

#### SEO & Sharing
- No structured data (JSON-LD) for events
- No per-page Twitter Card meta (only root-level Open Graph)

#### Other
- No test suite (unit, integration, or e2e)
- No paid/premium tier or monetisation
- PWA service worker not implemented (manifest exists, offline support does not)

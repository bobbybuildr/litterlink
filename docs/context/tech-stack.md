# LitterLink — Tech Stack & Architecture

## Framework

- **Next.js 16.2.1** — App Router only. No Pages Router.
- **React 19.2.4**
- **TypeScript 5**
- **Turbopack** is the default dev bundler (`next dev` uses it automatically)

## Auth & Database

- **Supabase** — PostgreSQL database, Auth, Storage, and Realtime
- **`@supabase/ssr` v0.9** — server-side client with cookie-based session handling
- **`@supabase/supabase-js` v2.100** — base JS client

### Client factories

Two distinct client factories must be used in the right context:

```ts
import { createClient } from "@/lib/supabase/server";  // Server Components, Server Actions, Route Handlers
import { createClient } from "@/lib/supabase/client";  // Client Components only
```

### Auth rules

- Always use `getUser()` on the server — never `getSession()` (getUser validates the JWT)
- Auth is checked in Server Actions and Server Components directly
- Route protection is enforced in `src/proxy.ts` (see below)

### Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — note: NOT `ANON_KEY`
- `SUPABASE_SECRET_KEY` — service-role key, used server-side only (admin user lookups)
- `COMING_SOON` — set to `"true"` to enable the pre-launch gate (scoped to `/`, `/events`, `/events/*`)
- `RESEND_API_KEY` — Resend email API key
- `RESEND_FROM` — sender address, e.g. `"LitterLink <noreply@litterlink.co.uk>"` (optional — defaults to that value)
- `ADMIN_EMAIL` — email address for admin notifications (organiser application alerts)
- `NEXT_PUBLIC_SITE_URL` — canonical site URL, e.g. `"https://litterlink.co.uk"` (used in emails and OG meta)

## Styling

- **Tailwind CSS v4** with PostCSS plugin (`@tailwindcss/postcss`)
- `cn()` helper from `@/lib/utils` — wraps `clsx` + `tailwind-merge` for conditional class merging
- `utcToLondonDatetimeLocal(iso)` helper from `@/lib/utils` — converts a UTC ISO string to a `datetime-local` input value in Europe/London time (handles BST/GMT automatically); used in event create and edit forms
- Always use `cn()` for conditional classes, never string concatenation

## Map

- **`react-leaflet` v5** + **`leaflet` v1.9.4**
- Must be used inside a `"use client"` component
- Must be dynamically imported (no SSR) — `next/dynamic` with `ssr: false`
- Leaflet default marker icons require a manual fix (broken in Webpack/Turbopack)

## Geocoding

- **`postcodes.io`** public REST API — UK postcodes only
- Server-side only (`src/lib/geocode.ts`)
- Strips whitespace, uppercases, and URL-encodes the postcode before the request
- Uses `next: { revalidate: 86400 }` — responses cached for 24 hours via Next.js fetch cache
- Returns `{ latitude, longitude, postcode }` or `null` on failure

## Email

- **`resend` v6.9** — transactional email via the Resend API
- All email logic lives in `src/lib/email.ts`
- Plain-text emails only (no HTML templates)
- Sends: join/leave/cancel confirmations, organiser application submission + outcome emails, event created confirmation, event updated (date/time/location changed) participant notifications
- Stats-reminder emails are sent by the `send-event-reminders` Edge Function (not via this module)
- In-process rate limiting (60-second cooldown per key) to prevent burst sends
- Errors are swallowed — a mail failure never blocks a user action

## Icons

- **`lucide-react` v1** — tree-shakeable SVG icons as React components

## Image Compression

- **`browser-image-compression` v2** — client-side image compression before upload (used in photo and avatar upload flows)

## Analytics

- **`@vercel/analytics` v2** — page view tracking
- **`@vercel/speed-insights` v2** — Core Web Vitals monitoring

## Security & Validation

- **`src/lib/sanitize.ts`** — `sanitizeText()` strips HTML tags from all user-supplied text before DB writes (XSS defence-in-depth)
- **`src/lib/ratelimit.ts`** — DB-backed rate limiting helpers:
  - `isEventCreationRateLimited()` — 5 events per user per 24 hours
  - `isJoinRateLimited()` — 20 joins per user per hour
  - `isRescheduleNotificationRateLimited()` — 15-minute per-event cooldown; prevents organisers from spamming participants by toggling the datetime repeatedly (checked against `events.reschedule_notified_at`)
- `redirectTo` open-redirect protection in `signInWithEmail` — only relative paths accepted

## Next.js 16 Breaking Changes

These differ from prior Next.js versions and must be followed precisely:

### `proxy.ts` replaces `middleware.ts`

The middleware file is now `src/proxy.ts` and exports `proxy()` instead of `middleware()`:

```ts
export async function proxy(request: NextRequest): Promise<NextResponse>
```

### `params` and `searchParams` are Promises

Always `await` them in page and layout components:

```ts
// ✅ correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### `cookies()` and `headers()` are async

```ts
const cookieStore = await cookies();
const headersList = await headers();
```

## Server Actions

Co-located in `actions.ts` beside the page that uses them. Every action file starts with `"use server"`.

```ts
"use server";
import { createClient } from "@/lib/supabase/server";

export async function myAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  // ... mutate data
  revalidatePath("/some-path");
  return { error: null };
}
```

Mutation actions return `{ error: string | null }`. On success, they call `revalidatePath()` then `redirect()`.

## Component Conventions

- Server Components by default; add `"use client"` only for interactivity or browser APIs
- Props typed inline with interfaces; `className?: string` accepted on most components
- `cn()` for all conditional class merging
- Key component examples: `EventCard`, `JoinButton`, `ShareUrl`, `EventsMap`

## Key Directories

| Path | Purpose |
|---|---|
| `src/app/` | App Router pages and layouts |
| `src/app/(auth)/actions.ts` | Sign-in / sign-up / sign-out Server Actions |
| `src/app/events/` | Events listing, detail, create, edit, stats pages + actions |
| `src/app/events/[id]/edit/` | Event editing page + `updateEvent` action |
| `src/app/groups/` | Groups listing (placeholder), group detail, create group |
| `src/app/become-a-verified-organiser/` | Organiser application form + actions |
| `src/app/admin/` | Admin panel (applications review) |
| `src/components/` | Shared UI components |
| `src/lib/events.ts` | Data-fetching helpers (typed Supabase query wrappers) |
| `src/lib/geocode.ts` | `postcodes.io` geocoding helper |
| `src/lib/email.ts` | Resend email sending helpers |
| `src/lib/ratelimit.ts` | DB-backed rate limiting for event creation and joining |
| `src/lib/sanitize.ts` | HTML-strip sanitizer for user input |
| `src/lib/supabase/` | Supabase client factories (server, client, middleware) |
| `src/types/database.ts` | Hand-written DB types — update when schema changes |
| `src/proxy.ts` | Auth session refresh + route protection (replaces middleware.ts) |
| `supabase/migrations/` | SQL migration files |
| `supabase/functions/send-event-reminders/` | Deno Edge Function — cron stats-reminder emails |

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
- `COMING_SOON` — set to `"true"` to enable the pre-launch gate

## Styling

- **Tailwind CSS v4** with PostCSS plugin (`@tailwindcss/postcss`)
- `cn()` helper from `@/lib/utils` — wraps `clsx` + `tailwind-merge` for conditional class merging
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

## Icons

- **`lucide-react` v1** — tree-shakeable SVG icons as React components

## Analytics

- **`@vercel/analytics` v2** — page view tracking
- **`@vercel/speed-insights` v2** — Core Web Vitals monitoring

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
| `src/app/events/` | Events listing, detail, create, stats pages + actions |
| `src/components/` | Shared UI components |
| `src/lib/events.ts` | Data-fetching helpers (typed Supabase query wrappers) |
| `src/lib/geocode.ts` | `postcodes.io` geocoding helper |
| `src/lib/supabase/` | Supabase client factories (server, client, middleware) |
| `src/types/database.ts` | Hand-written DB types — update when schema changes |
| `src/proxy.ts` | Auth session refresh + route protection (replaces middleware.ts) |
| `supabase/migrations/` | SQL migration files |

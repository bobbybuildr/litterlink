<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LitterLink — Workspace Instructions

LitterLink is a Next.js 16 app for finding and joining local litter-picking events. UK postcodes are geocoded to lat/lng for map-based discovery.

## Build & Dev Commands

```bash
npm run dev      # dev server (Turbopack enabled)
npm run build    # production build — run this to validate changes
npm run lint     # ESLint
```

No test suite is configured yet.

## Architecture

- **Framework**: Next.js 16.2.1, App Router only — no Pages Router
- **Auth & DB**: Supabase (`@supabase/ssr` v0.9) with Row-Level Security
- **Styling**: Tailwind CSS v4, `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- **Icons**: `lucide-react`
- **Map**: `react-leaflet` + `leaflet` (must be `"use client"`, use dynamic import to avoid SSR)
- **Geocoding**: UK postcodes via `postcodes.io` — server-side only (`@/lib/geocode`)
- **Email**: `resend` v6.9 — all sending logic in `@/lib/email`
- **Image compression**: `browser-image-compression` v2 — client-side, used before uploads

### Key directories

| Path | Purpose |
|------|---------|
| `src/app/` | App Router pages and layouts |
| `src/app/(auth)/actions.ts` | Sign-in / sign-up / sign-out Server Actions |
| `src/app/events/` | Events listing, detail, create, stats |
| `src/app/groups/` | Groups listing (placeholder), group detail, create group |
| `src/app/become-a-verified-organiser/` | Organiser application form + actions |
| `src/app/admin/` | Admin panel — organiser applications |
| `src/components/` | Shared UI components |
| `src/lib/events.ts` | Data-fetching helpers (typed query wrappers) |
| `src/lib/email.ts` | Resend email helpers |
| `src/lib/ratelimit.ts` | DB-backed rate limiting (event creation, joins) |
| `src/lib/sanitize.ts` | `sanitizeText()` — strips HTML from user input |
| `src/lib/supabase/` | Supabase client factories |
| `src/types/database.ts` | Hand-written DB types — update when schema changes |
| `supabase/migrations/` | SQL migration files |
| `src/proxy.ts` | Auth session refresh proxy (replaces `middleware.ts`) |

### Key tables

| Table | Notes |
|-------|-------|
| `profiles` | `is_verified_organiser` BOOLEAN, `is_admin` BOOLEAN |
| `events` | `group_id` (nullable FK), `organiser_contact_details` (nullable text); `organiser_id` is nullable (SET NULL on account deletion) |
| `groups` | `group_type` enum-like text, `created_by` nullable |
| `organiser_applications` | status: `pending \| approved \| rejected` |
| `email_preferences` | per-user opt-in/out, auto-created on profile creation |
| `events_with_counts` | view — adds `organiser_is_verified`, `group_name`, `group_slug`, `confirmed_count` |

## Next.js 16 Breaking Changes

These differ from any prior Next.js version in your training data:

- **`middleware.ts` is gone** — renamed to `proxy.ts`. Export `proxy()` (not `middleware()`). See `src/proxy.ts`.
- **`params` and `searchParams` are Promises** — always `await params` in pages/layouts:
  ```ts
  // ✅ correct
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```
- **`cookies()` and `headers()` are async** — `const cookieStore = await cookies();`
- **Turbopack** is the default dev bundler (`next dev` uses Turbopack automatically via `next.config.ts`)

## Supabase Conventions

**Client factories** — always import the right one:
```ts
import { createClient } from "@/lib/supabase/server";  // Server Components, Actions, Route Handlers
import { createClient } from "@/lib/supabase/client";  // Client Components only
```

**Auth checks** — use `getUser()`, never `getSession()` on the server (getUser validates the JWT):
```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/sign-in");
```

**Environment variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` ← NOT `ANON_KEY`
- `SUPABASE_SECRET_KEY` ← service-role key, server-side only
- `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`

**Types** — derive from the `Database` type in `@/types/database.ts`:
```ts
import type { Database } from "@/types/database";
type EventRow = Database["public"]["Tables"]["events"]["Row"];
```

## Server Actions

Co-located in `actions.ts` beside the page that uses them. Every action file starts with `"use server"`. Pattern:

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

Actions return `{ error: string | null }` on mutation or call `redirect()` on success.

## Component Conventions

- Server Components by default; add `"use client"` only for interactivity or browser APIs
- Props typed inline with interfaces; `className?: string` accepted on most components
- Use `cn()` for conditional class merging, not string concatenation
- `EventCard`, `JoinButton`, `ShareUrl`, `EventsMap` are exemplar components for style reference

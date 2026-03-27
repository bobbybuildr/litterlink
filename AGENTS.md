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

### Key directories

| Path | Purpose |
|------|---------|
| `src/app/` | App Router pages and layouts |
| `src/app/(auth)/actions.ts` | Sign-in / sign-up / sign-out Server Actions |
| `src/app/events/` | Events listing, detail, create, stats |
| `src/components/` | Shared UI components |
| `src/lib/events.ts` | Data-fetching helpers (typed query wrappers) |
| `src/lib/supabase/` | Supabase client factories |
| `src/types/database.ts` | Hand-written DB types — update when schema changes |
| `supabase/migrations/` | SQL migration files |
| `src/proxy.ts` | Auth session refresh proxy (replaces `middleware.ts`) |

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

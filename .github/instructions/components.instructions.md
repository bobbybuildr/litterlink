---
description: "Use when creating or editing React components in src/components/. Covers class merging with cn(), use client directive placement, lucide-react icon usage, and component structure conventions."
applyTo: "src/components/**"
---

# Component Conventions

## Class Merging — always use `cn()`

Never concatenate class strings. Use `cn()` from `@/lib/utils` for all conditional or merged classes:

```ts
// ✅
import { cn } from "@/lib/utils";
<div className={cn("base-styles", isActive && "active-styles", className)} />

// ❌
<div className={`base-styles ${isActive ? "active-styles" : ""}`} />
```

Accept `className?: string` as a prop on any component that renders a root element, and pass it into `cn()` as the last argument so callers can extend styles.

## `"use client"` — only when required

Default to Server Components. Add `"use client"` **only** if the component uses:
- React hooks (`useState`, `useEffect`, `useTransition`, `useRef`, etc.)
- Browser-only APIs (`window`, `document`, `navigator`)
- Event handlers that require client-side state
- Supabase Realtime subscriptions

`"use client"` must be the **first line** of the file, before any imports.

Examples from this codebase:
- `JoinButton.tsx` — needs `useState`, `useTransition`, Realtime → `"use client"` ✅
- `EventsMap.tsx` — needs `useEffect`, Leaflet (browser-only) → `"use client"` ✅
- `EventCard.tsx` — pure display, no hooks → Server Component, no directive ✅

## Icons — `lucide-react` only

Import icons exclusively from `lucide-react`. Do not install or use other icon libraries.

```ts
import { MapPin, Calendar, Users, ArrowLeft } from "lucide-react";
```

Size icons with Tailwind (`h-4 w-4`, `h-5 w-5`). Do not use inline `style` for sizing.

## Props

- Type props inline with an `interface` named `<ComponentName>Props`
- Always include `className?: string` on components that accept external styling
- No default exports — use named exports consistently:

```ts
// ✅
export function EventCard({ event, className }: EventCardProps) { … }

// ❌
export default function EventCard(…) { … }
```

## Client Components that use Supabase

Use the **browser client** — never the server client in a `"use client"` component:

```ts
import { createClient } from "@/lib/supabase/client";
```

# LitterLink

A community platform for discovering and joining local litter-picking events across the UK. Find events near you on an interactive map, track your impact, and help keep your community clean.

![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)

## Features

- **Interactive Map** — Browse nearby litter-picking events using a postcode-based radius search powered by [postcodes.io](https://postcodes.io) and Leaflet
- **Event Management** — Create, publish, and cancel events; set attendee limits with automatic waitlisting
- **RSVP System** — Join or leave events with confirmed/waitlisted status and live participant count updates via Supabase Realtime
- **Impact Tracking** — Organizers log post-event stats (bags collected, weight, area covered); community totals displayed on the homepage
- **Personal Dashboard** — View events you've joined and events you're organising
- **User Profiles** — Customise display name, home postcode, and avatar
- **Authentication** — Email/password sign-up with email confirmation, plus Google OAuth

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16.2.1](https://nextjs.org) (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, lucide-react |
| Auth & DB | [Supabase](https://supabase.com) (`@supabase/ssr`) with Row-Level Security |
| Map | react-leaflet 5 + Leaflet 1.9 |
| Geocoding | [postcodes.io](https://postcodes.io) (server-side, UK postcodes only) |
| Utilities | clsx + tailwind-merge (`cn()`) |


## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Sign-in, sign-up pages + auth actions
│   ├── auth/callback/    # OAuth callback route
│   ├── dashboard/        # Joined & organised events
│   ├── events/           # Browse events
│   │   ├── [id]/         # Event detail + stats logging
│   │   └── create/       # Create new event
│   ├── profile/          # User profile editor
│   └── layout.tsx        # Root layout
├── components/
│   ├── events/           # EventCard, EventsFilter, JoinButton, ShareUrl
│   ├── layout/           # Navbar, Footer, NavLinks, SignOutButton
│   └── map/              # EventsMap (Leaflet, client-only)
├── lib/
│   ├── events.ts         # Typed data-fetching helpers
│   ├── geocode.ts        # postcodes.io geocoding
│   ├── utils.ts          # cn() utility
│   └── supabase/         # Client factories (server / client)
└── types/
    └── database.ts       # Hand-written DB types
```

## Database Schema

```
profiles          — User profiles (auto-created on sign-up)
events            — Litter-picking events with postcode + lat/lng
event_participants — RSVP records (confirmed / waitlisted / cancelled)
event_stats       — Post-event impact data (bags, weight, area)
event_photos      — Photos linked to events (stored in Supabase Storage)
```

A `events_with_counts` view joins events with organiser details and confirmed participant counts. The `haversine_distance()` SQL function powers radius-based filtering.

## Architecture Notes

- **App Router only** — no Pages Router
- **Server Components by default** — `"use client"` only where interactivity or browser APIs are required
- **Server Actions** — mutations co-located in `actions.ts` files beside their pages
- **`proxy.ts`** replaces `middleware.ts` (Next.js 16); exports `proxy()` for auth session refresh
- **`params` / `searchParams` are Promises** in Next.js 16 — always `await` them in pages and layouts
- The Leaflet map is dynamically imported (`next/dynamic`) to avoid SSR errors
- Postcodes are geocoded server-side and cached for 24 hours

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a pull request

## License

MIT

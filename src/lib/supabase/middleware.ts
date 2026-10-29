import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env/public";

const PROFILE_ROBOTS_TAG = "noindex, nofollow";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProfileRoute = pathname.startsWith("/profile");

  // Protect dashboard, event-creation, and profile routes
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events/create") ||
    isProfileRoute;

  const isAuthRoute = pathname === "/sign-in" || pathname === "/sign-up";

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do NOT add logic between createServerClient and the
  // auth call below; a stale session can cause infinite redirect loops.
  //
  // Only protected and sign-in/sign-up routes make an access decision, so only
  // they verify the user with the Auth server. Everywhere else the proxy just
  // needs the refreshed cookies: getClaims() refreshes an expiring session and
  // checks the token locally, saving an Auth round trip on every page view and
  // link prefetch.
  if (!isProtectedRoute && !isAuthRoute) {
    await supabase.auth.getClaims();
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", pathname);
    if (pathname.startsWith("/profile/")) {
      url.searchParams.set("message", "Sign in to view member profiles on LitterLink.");
    }
    const redirectResponse = NextResponse.redirect(url);
    // Crawlers are anonymous, so the noindex must be on the redirect itself, not only on the sign-in page.
    if (isProfileRoute) redirectResponse.headers.set("X-Robots-Tag", PROFILE_ROBOTS_TAG);
    return redirectResponse;
  }

  if (isProfileRoute) supabaseResponse.headers.set("X-Robots-Tag", PROFILE_ROBOTS_TAG);

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

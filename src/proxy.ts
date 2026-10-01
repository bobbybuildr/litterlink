import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk").host;

export async function proxy(request: NextRequest) {
  // Auth cookies (incl. the OAuth PKCE verifier) are host-only, so www must not diverge from the callback host.
  if (request.nextUrl.host === `www.${siteHost}`) {
    const url = request.nextUrl.clone();
    url.host = siteHost;
    return NextResponse.redirect(url, 308);
  }

  if (process.env.COMING_SOON === "true") {
    const { pathname } = request.nextUrl;
    if (pathname === "/" || pathname === "/events" || pathname.startsWith("/events/")) {
      return NextResponse.redirect(new URL("/coming-soon", request.url));
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico   (favicon)
     * - Public assets (png, svg, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

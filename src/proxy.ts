import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (process.env.COMING_SOON === "true") {
    const { pathname } = request.nextUrl;
    const isExempt =
      pathname === "/coming-soon" ||
      pathname.startsWith("/auth/");
    if (!isExempt) {
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

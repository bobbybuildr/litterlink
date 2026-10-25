import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn() }));

import { config } from "@/proxy";

function runsOn(url: string) {
  return unstable_doesMiddlewareMatch({ config, url });
}

describe("proxy matcher", () => {
  it.each(["/", "/events", "/events/abc", "/dashboard", "/profile", "/sign-in", "/terms"])(
    "runs on %s",
    (path) => {
      expect(runsOn(path)).toBe(true);
    }
  );

  it.each(["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"])(
    "skips the session refresh for %s",
    (path) => {
      expect(runsOn(path)).toBe(false);
    }
  );

  it.each(["/_next/static/chunk.js", "/_next/image", "/favicon.ico", "/logo.png"])(
    "skips static asset %s",
    (path) => {
      expect(runsOn(path)).toBe(false);
    }
  );
});

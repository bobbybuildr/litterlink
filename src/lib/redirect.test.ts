import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/redirect";

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/events/123", "/events?radius=10&postcode=BN1#map", "/reset-password"])(
    "keeps the same-origin path %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe(path);
    }
  );

  it.each([null, undefined, "", 42, new File([], "x")])("falls back for %s", (raw) => {
    expect(safeRedirectPath(raw)).toBe("/dashboard");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "javascript:alert(1)",
    "@evil.com",
    ".evil.com",
    "evil.com",
  ])("rejects off-site target %j", (raw) => {
    expect(safeRedirectPath(raw)).toBe("/dashboard");
  });

  it("uses the supplied fallback", () => {
    expect(safeRedirectPath("//evil.com", "/events")).toBe("/events");
  });

  it.each(["/%2F%2Fevil.com", "/./evil.com", "/../evil.com", "/ /evil.com"])(
    "always resolves %j to the site's own origin",
    (raw) => {
      const site = "https://litterlink.co.uk";
      expect(new URL(safeRedirectPath(raw), site).origin).toBe(site);
    }
  );
});

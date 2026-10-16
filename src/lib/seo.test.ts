import { describe, expect, it } from "vitest";
import { absoluteUrl, DEFAULT_SHARE_IMAGE, districtName, hasListingParams, metaDescription, pageMetadata } from "@/lib/seo";

describe("absoluteUrl", () => {
  it("prefixes the site URL", () => {
    expect(absoluteUrl("/events/abc")).toMatch(/^https?:\/\/[^/]+\/events\/abc$/);
    expect(absoluteUrl("events")).toMatch(/\/events$/);
  });
});

describe("metaDescription", () => {
  it("collapses whitespace and line breaks", () => {
    expect(metaDescription("  Meet at the\n\n  car park   by the pier. ")).toBe(
      "Meet at the car park by the pier."
    );
  });

  it("leaves short text alone", () => {
    expect(metaDescription("Short.", 10)).toBe("Short.");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const result = metaDescription("one two three four five six", 15);
    expect(result).toBe("one two three…");
    expect(result.length).toBeLessThanOrEqual(15);
  });

  it("hard-cuts a single long word", () => {
    expect(metaDescription("a".repeat(30), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(metaDescription("Litter pick, beach clean, park tidy", 14)).toBe("Litter pick…");
  });
});

describe("districtName", () => {
  it("un-inverts ONS-style city and county names", () => {
    expect(districtName("Bristol, City of")).toBe("Bristol");
    expect(districtName("Kingston upon Hull, City of")).toBe("Kingston upon Hull");
    expect(districtName("Herefordshire, County of")).toBe("Herefordshire");
  });

  it("leaves other names alone", () => {
    expect(districtName("City of Edinburgh")).toBe("City of Edinburgh");
    expect(districtName("Bromsgrove")).toBe("Bromsgrove");
  });

  it("returns null when there is no district", () => {
    expect(districtName(null)).toBeNull();
    expect(districtName(undefined)).toBeNull();
    expect(districtName("  ")).toBeNull();
  });
});

describe("hasListingParams", () => {
  const keys = ["postcode", "page"] as const;

  it("is false for the bare listing", () => {
    expect(hasListingParams({}, keys)).toBe(false);
    expect(hasListingParams({ postcode: "", page: undefined }, keys)).toBe(false);
  });

  it("ignores unrelated params such as flash or utm_*", () => {
    expect(hasListingParams({ flash: "groupDeleted", utm_source: "x" }, keys)).toBe(false);
  });

  it("detects filter and pagination params", () => {
    expect(hasListingParams({ postcode: "SW1A 1AA" }, keys)).toBe(true);
    expect(hasListingParams({ page: "2" }, keys)).toBe(true);
    expect(hasListingParams({ page: ["", "2"] }, keys)).toBe(true);
  });
});

describe("pageMetadata", () => {
  it("emits a canonical and matching Open Graph URL for indexable pages", () => {
    const meta = pageMetadata({ title: "Events", description: "d", path: "/events" });
    expect(meta.alternates?.canonical).toBe("/events");
    expect(meta.robots).toBeUndefined();
    expect(meta.openGraph).toMatchObject({ url: "/events", title: "Events", locale: "en_GB" });
  });

  it("keeps the default share image when replacing the root Open Graph object", () => {
    const meta = pageMetadata({ title: "Events", description: "d", path: "/events", indexable: false });
    expect(meta.openGraph?.images).toEqual(DEFAULT_SHARE_IMAGE);
  });

  it("omits the default image so a route's own opengraph-image file applies", () => {
    const meta = pageMetadata({ title: "Event", description: "d", path: "/events/1", defaultImage: false });
    expect(meta.openGraph).not.toHaveProperty("images");
    expect(meta.openGraph).toMatchObject({ url: "/events/1", siteName: "LitterLink", locale: "en_GB" });
  });

  it("marks non-indexable variants noindex,follow without a canonical", () => {
    const meta = pageMetadata({ title: "Events", description: "d", path: "/events", indexable: false });
    expect(meta.alternates).toBeUndefined();
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("supports absolute titles", () => {
    expect(pageMetadata({ title: "Home", description: "d", path: "/", absoluteTitle: true }).title).toEqual({
      absolute: "Home",
    });
  });
});

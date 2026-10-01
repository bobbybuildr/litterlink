import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lower-cases and hyphenates words", () => {
    expect(slugify("Clean Up Brighton")).toBe("clean-up-brighton");
  });

  it("drops punctuation", () => {
    expect(slugify("St. Mary's Litter Pickers!")).toBe("st-marys-litter-pickers");
  });

  it("collapses runs of whitespace and hyphens", () => {
    expect(slugify("Hove   --  Beach")).toBe("hove-beach");
  });

  it("trims surrounding whitespace", () => {
    expect(slugify("  Leeds Pickers  ")).toBe("leeds-pickers");
  });

  it("keeps digits", () => {
    expect(slugify("Team 42")).toBe("team-42");
  });

  it("caps the slug at 80 characters", () => {
    expect(slugify("a".repeat(120))).toHaveLength(80);
  });

  it("returns an empty string when there are no letters or digits", () => {
    expect(slugify("!!!")).toBe("");
  });
});

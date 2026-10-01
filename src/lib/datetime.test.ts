import { describe, expect, it } from "vitest";
import { londonToUTC, utcToLondonDatetimeLocal } from "@/lib/datetime";

// UK clocks change at 01:00 UTC: 2026-03-29 (GMT → BST) and 2026-10-25 (BST → GMT).

describe("londonToUTC", () => {
  it("treats winter times as GMT (UTC+0)", () => {
    expect(londonToUTC("2026-01-15T10:00")).toBe("2026-01-15T10:00:00.000Z");
  });

  it("treats summer times as BST (UTC+1)", () => {
    expect(londonToUTC("2026-07-15T10:00")).toBe("2026-07-15T09:00:00.000Z");
  });

  it("handles the day the clocks go forward", () => {
    expect(londonToUTC("2026-03-29T00:30")).toBe("2026-03-29T00:30:00.000Z");
    expect(londonToUTC("2026-03-29T03:00")).toBe("2026-03-29T02:00:00.000Z");
  });

  it("handles the day the clocks go back", () => {
    expect(londonToUTC("2026-10-25T00:30")).toBe("2026-10-24T23:30:00.000Z");
    expect(londonToUTC("2026-10-25T03:00")).toBe("2026-10-25T03:00:00.000Z");
  });

  it("crosses the date line back to the previous UTC day at BST midnight", () => {
    expect(londonToUTC("2026-06-01T00:00")).toBe("2026-05-31T23:00:00.000Z");
  });
});

describe("utcToLondonDatetimeLocal", () => {
  it("formats GMT and BST instants in London local time", () => {
    expect(utcToLondonDatetimeLocal("2026-01-15T10:00:00.000Z")).toBe("2026-01-15T10:00");
    expect(utcToLondonDatetimeLocal("2026-07-15T09:00:00.000Z")).toBe("2026-07-15T10:00");
  });

  it("uses 00 rather than 24 for the midnight hour", () => {
    expect(utcToLondonDatetimeLocal("2026-01-15T00:05:00.000Z")).toBe("2026-01-15T00:05");
  });

  it.each([
    "2026-01-15T10:00",
    "2026-03-29T00:30",
    "2026-03-29T03:00",
    "2026-07-15T23:45",
    "2026-10-25T00:30",
    "2026-10-25T03:00",
    "2026-12-31T23:59",
  ])("round-trips %s through londonToUTC", (local) => {
    expect(utcToLondonDatetimeLocal(londonToUTC(local))).toBe(local);
  });
});

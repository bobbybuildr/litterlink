import { describe, expect, it } from "vitest";
import {
  addDaysToIsoDate,
  formatIsoDate,
  isIsoDate,
  MAX_EVENT_RANGE_DAYS,
  parseEventDateRange,
  parsePage,
  parsePostcode,
  parseRadiusKm,
} from "@/lib/search-params";

describe("parsePostcode", () => {
  it.each([
    ["SW1A 1AA", "SW1A 1AA"],
    [" sw1a1aa ", "SW1A1AA"],
    ["m1 1ae", "M1 1AE"],
  ])("accepts %j as %j", (raw, expected) => {
    expect(parsePostcode(raw)).toBe(expected);
  });

  it.each([undefined, "", "   ", "Buy cheap stuff at spam.example", "SW1A 1AA <b>", "SW1A     1AA"])(
    "rejects %j",
    (raw) => {
      expect(parsePostcode(raw)).toBeNull();
    }
  );
});

describe("parsePage", () => {
  it.each([
    ["1", 1],
    ["3", 3],
    ["2.7", 2],
    [undefined, 1],
    ["", 1],
    ["abc", 1],
    ["0", 1],
    ["-3", 1],
  ])("parses %j as %d", (raw, expected) => {
    expect(parsePage(raw)).toBe(expected);
  });
});

describe("parseRadiusKm", () => {
  it.each(["8", "16", "40", "80"])("accepts the filter option %s", (raw) => {
    expect(parseRadiusKm(raw)).toBe(Number(raw));
  });

  it.each([undefined, "", "abc", "17", "99999", "-8", "16.0"])(
    "falls back to the default for %j",
    (raw) => {
      expect(parseRadiusKm(raw)).toBe(16);
    }
  );
});

describe("date helpers", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-10-04")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it("adds days across month, year, leap-day and clock-change boundaries", () => {
    expect(addDaysToIsoDate("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToIsoDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToIsoDate("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToIsoDate("2026-10-24", 7)).toBe("2026-10-31");
  });

  it("formats dates in UK long form", () => {
    expect(formatIsoDate("2027-01-01")).toBe("1 January 2027");
  });
});

describe("parseEventDateRange", () => {
  const now = new Date("2026-10-04T15:30:00Z");

  it("allows a span of 365 days", () => {
    expect(MAX_EVENT_RANGE_DAYS).toBe(365);
  });

  it("defaults to today plus 7 days", () => {
    expect(parseEventDateRange(undefined, undefined, now)).toEqual({
      from: "2026-10-04",
      to: "2026-10-11",
      clamped: false,
    });
  });

  it("keeps a valid range unchanged", () => {
    expect(parseEventDateRange("2026-10-01", "2026-11-15", now)).toEqual({
      from: "2026-10-01",
      to: "2026-11-15",
      clamped: false,
    });
  });

  it("defaults the end to 7 days after a given start", () => {
    expect(parseEventDateRange("2026-12-01", undefined, now)).toEqual({
      from: "2026-12-01",
      to: "2026-12-08",
      clamped: false,
    });
  });

  it("defaults the start to today when only the end is given", () => {
    expect(parseEventDateRange(undefined, "2026-10-20", now)).toEqual({
      from: "2026-10-04",
      to: "2026-10-20",
      clamped: false,
    });
  });

  it("swaps a reversed range without flagging it", () => {
    expect(parseEventDateRange("2026-11-15", "2026-10-01", now)).toEqual({
      from: "2026-10-01",
      to: "2026-11-15",
      clamped: false,
    });
  });

  it("allows a full calendar year", () => {
    expect(parseEventDateRange("2026-01-01", "2027-01-01", now)).toEqual({
      from: "2026-01-01",
      to: "2027-01-01",
      clamped: false,
    });
  });

  it("clamps one day past the maximum span and flags it", () => {
    expect(parseEventDateRange("2026-01-01", "2027-01-02", now)).toEqual({
      from: "2026-01-01",
      to: "2027-01-01",
      clamped: true,
    });
  });

  it("clamps a crafted multi-decade range", () => {
    expect(parseEventDateRange("2020-01-01", "2099-12-31", now)).toEqual({
      from: "2020-01-01",
      to: "2020-12-31",
      clamped: true,
    });
  });

  it.each(["2026-02-31", "2026-13-01", "26-10-01", "2026-10-1", "2026-10-01T00:00", "today", ""])(
    "ignores the malformed date %j",
    (raw) => {
      expect(parseEventDateRange(raw, raw, now)).toEqual({
        from: "2026-10-04",
        to: "2026-10-11",
        clamped: false,
      });
    }
  );
});

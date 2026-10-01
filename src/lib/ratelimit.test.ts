import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  consumeGeocodeRateLimit,
  isEventCreationRateLimited,
  isGroupJoinRateLimited,
  isJoinRateLimited,
  isRescheduleNotificationRateLimited,
} from "@/lib/ratelimit";

// The real admin client needs server-only env vars.
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const NOW = new Date("2026-06-01T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60 * 1000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("isRescheduleNotificationRateLimited", () => {
  it("allows the first notification", () => {
    expect(isRescheduleNotificationRateLimited(null)).toBe(false);
  });

  it("blocks within the 15-minute cooldown", () => {
    expect(isRescheduleNotificationRateLimited(minutesAgo(0))).toBe(true);
    expect(isRescheduleNotificationRateLimited(minutesAgo(14.99))).toBe(true);
  });

  it("allows again once 15 minutes have passed", () => {
    expect(isRescheduleNotificationRateLimited(minutesAgo(15))).toBe(false);
    expect(isRescheduleNotificationRateLimited(minutesAgo(60))).toBe(false);
  });
});

function countClient(count: number | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(async () => ({ count })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const client = { from: vi.fn(() => query) };
  return { client: client as unknown as SupabaseClient<Database>, query, from: client.from };
}

describe.each([
  {
    name: "isEventCreationRateLimited",
    fn: isEventCreationRateLimited,
    table: "events",
    userColumn: "organiser_id",
    timeColumn: "created_at",
    limit: 5,
    windowMs: 24 * HOUR_MS,
  },
  {
    name: "isJoinRateLimited",
    fn: isJoinRateLimited,
    table: "event_participants",
    userColumn: "user_id",
    timeColumn: "joined_at",
    limit: 20,
    windowMs: HOUR_MS,
  },
  {
    name: "isGroupJoinRateLimited",
    fn: isGroupJoinRateLimited,
    table: "group_members",
    userColumn: "user_id",
    timeColumn: "joined_at",
    limit: 10,
    windowMs: HOUR_MS,
  },
])("$name", ({ fn, table, userColumn, timeColumn, limit, windowMs }) => {
  it(`allows below ${limit}`, async () => {
    expect(await fn("user-1", countClient(limit - 1).client)).toBe(false);
  });

  it(`blocks at ${limit}`, async () => {
    expect(await fn("user-1", countClient(limit).client)).toBe(true);
    expect(await fn("user-1", countClient(limit + 1).client)).toBe(true);
  });

  it("allows when the count is unavailable", async () => {
    expect(await fn("user-1", countClient(null).client)).toBe(false);
  });

  it("counts only this user's rows within the window", async () => {
    const { client, query, from } = countClient(0);
    await fn("user-1", client);
    expect(from).toHaveBeenCalledWith(table);
    expect(query.eq).toHaveBeenCalledWith(userColumn, "user-1");
    expect(query.gte).toHaveBeenCalledWith(
      timeColumn,
      new Date(NOW.getTime() - windowMs).toISOString()
    );
  });
});

describe("consumeGeocodeRateLimit", () => {
  const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

  function mockRpc(result: { data: unknown; error: unknown }) {
    const rpc = vi.fn(async () => result);
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as unknown as ReturnType<
      typeof createAdminClient
    >);
    return rpc;
  }

  it("keys the limit on a hash of the first x-forwarded-for address", async () => {
    const rpc = mockRpc({ data: 0, error: null });
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

    expect(await consumeGeocodeRateLimit("geocode", headers)).toBe(0);
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_key: `geocode:${sha256("203.0.113.7")}`,
      p_limit: 30,
      p_window_seconds: 60,
    });
  });

  it("never sends the raw IP to the database", async () => {
    const rpc = mockRpc({ data: 0, error: null });
    await consumeGeocodeRateLimit("geocode", new Headers({ "x-forwarded-for": "203.0.113.7" }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("203.0.113.7");
  });

  it("falls back to x-real-ip", async () => {
    const rpc = mockRpc({ data: 0, error: null });
    await consumeGeocodeRateLimit("reverse-geocode", new Headers({ "x-real-ip": "198.51.100.2" }));
    expect(rpc).toHaveBeenCalledWith(
      "consume_rate_limit",
      expect.objectContaining({ p_key: `reverse-geocode:${sha256("198.51.100.2")}` })
    );
  });

  it("returns the seconds until reset when over the limit", async () => {
    mockRpc({ data: 42, error: null });
    expect(await consumeGeocodeRateLimit("geocode", new Headers())).toBe(42);
  });

  it("fails open when the database errors", async () => {
    mockRpc({ data: null, error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await consumeGeocodeRateLimit("geocode", new Headers())).toBe(0);
  });
});

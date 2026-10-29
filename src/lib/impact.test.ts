import { describe, expect, it, vi } from "vitest";
import { getHomepageStats } from "@/lib/impact";
import { createClient } from "@/lib/supabase/server";

// impact.ts is server-only and reads through the cookie-based client; neither is needed here.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

function mockClient({ eventCount, stats }: { eventCount: number | null; stats: unknown }) {
  const tables: string[] = [];
  const from = vi.fn((table: string) => {
    tables.push(table);
    const query: Record<string, unknown> = {};
    query.select = vi.fn(() => query);
    // events: head count ending in .eq(); national_impact_stats: a single row ending in .single()
    query.eq = vi.fn(() => Promise.resolve({ count: eventCount, error: null }));
    query.single = vi.fn(() => Promise.resolve({ data: stats, error: null }));
    return query;
  });
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { tables };
}

describe("getHomepageStats", () => {
  it("uses the completed-event count and the pre-summed totals", async () => {
    mockClient({ eventCount: 125, stats: { total_bags: 1703, total_volunteers: 1080 } });

    expect(await getHomepageStats()).toEqual({ eventCount: 125, totalBags: 1703, volunteerCount: 1080 });
  });

  it("reads the aggregate view and never the whole event_stats table", async () => {
    const { tables } = mockClient({ eventCount: 1, stats: { total_bags: 1, total_volunteers: 1 } });

    await getHomepageStats();

    expect(tables.sort()).toEqual(["events", "national_impact_stats"]);
  });

  it("falls back to zeros when nothing comes back", async () => {
    mockClient({ eventCount: null, stats: null });

    expect(await getHomepageStats()).toEqual({ eventCount: 0, totalBags: 0, volunteerCount: 0 });
  });
});

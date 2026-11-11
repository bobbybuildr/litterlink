import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "./create/actions";
import { updateEvent } from "./[id]/edit/actions";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEventCreatedEmail: vi.fn(), sendEventUpdatedEmails: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({
  isEventCreationRateLimited: vi.fn(async () => false),
  isRescheduleNotificationRateLimited: vi.fn(() => false),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/geocode", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/geocode")>()),
  resolveEventLocation: vi.fn(async () => ({
    ok: true,
    location: {
      postcode: "SW1A 1AA",
      latitude: 51.501,
      longitude: -0.141,
      outcode: "SW1A",
      adminDistrict: "Westminster",
    },
  })),
}));

const OWNER_ID = "user-1";
const EVENT_ID = "event-1";

const existingEvent = {
  organiser_id: OWNER_ID,
  status: "published",
  starts_at: "2099-01-01T10:00:00.000Z",
  ends_at: null,
  location_postcode: "SW1A 1AA",
  address_label: null,
  latitude: 51.501,
  longitude: -0.141,
  reschedule_notified_at: null,
  location_outcode: "SW1A",
  location_admin_district: "Westminster",
};

function eventForm(fields: Record<string, string> = {}) {
  const formData = new FormData();
  const values = { title: "Beach clean", starts_at: "2099-01-01T10:00", postcode: "SW1A 1AA", ...fields };
  for (const [name, value] of Object.entries(values)) formData.set(name, value);
  return formData;
}

function mockSupabase(tables: Record<string, unknown>) {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: OWNER_ID, email: null } } }) },
    from: (table: string) => tables[table],
  };
  vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>);
}

/** Server Actions finish with `redirect()`, which throws — treat that as "saved". */
async function submit<T extends { error: string | null }>(run: () => Promise<T>) {
  try {
    return { state: await run(), saved: false };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) {
      return { state: null, saved: true };
    }
    throw error;
  }
}

describe("createEvent icon_key", () => {
  const insert = vi.fn();

  beforeEach(() => {
    insert.mockReset();
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: EVENT_ID }, error: null }) }) });
    mockSupabase({ events: { insert } });
  });

  it("saves a key from the allowlist", async () => {
    const { saved } = await submit(() => createEvent({ error: null }, eventForm({ icon_key: "tree-pine" })));

    expect(saved).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ icon_key: "tree-pine" }));
  });

  it.each([
    ["omitted", {}],
    ["empty", { icon_key: "" }],
  ])("saves null when the icon is %s", async (_label, fields) => {
    const { saved } = await submit(() => createEvent({ error: null }, eventForm(fields)));

    expect(saved).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ icon_key: null }));
  });

  it.each(["not-an-icon", "Tree-Pine", "<script>alert(1)</script>", "constructor", "__proto__"])(
    "rejects %j without inserting",
    async (iconKey) => {
      const { state } = await submit(() => createEvent({ error: null }, eventForm({ icon_key: iconKey })));

      expect(state?.error).toBe("Please choose an icon from the list.");
      expect(insert).not.toHaveBeenCalled();
    },
  );
});

describe("updateEvent icon_key", () => {
  const update = vi.fn();

  function mockEventTables(existing: typeof existingEvent) {
    update.mockReset();
    update.mockReturnValue({ eq: async () => ({ error: null }) });
    mockSupabase({
      events: {
        select: () => ({ eq: () => ({ single: async () => ({ data: existing, error: null }) }) }),
        update,
      },
      event_participants: { select: () => ({ eq: () => ({ eq: async () => ({ count: 0 }) }) }) },
    });
  }

  beforeEach(() => mockEventTables(existingEvent));

  it("saves a changed key from the allowlist", async () => {
    const { saved } = await submit(() => updateEvent(EVENT_ID, { error: null }, eventForm({ icon_key: "waves" })));

    expect(saved).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ icon_key: "waves" }));
  });

  it("clears the icon when the key is empty", async () => {
    const { saved } = await submit(() => updateEvent(EVENT_ID, { error: null }, eventForm({ icon_key: "" })));

    expect(saved).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ icon_key: null }));
  });

  it("rejects a key outside the allowlist without updating", async () => {
    const { state } = await submit(() => updateEvent(EVENT_ID, { error: null }, eventForm({ icon_key: "not-an-icon" })));

    expect(state?.error).toBe("Please choose an icon from the list.");
    expect(update).not.toHaveBeenCalled();
  });

  it("still refuses to edit another organiser's event", async () => {
    mockEventTables({ ...existingEvent, organiser_id: "someone-else" });

    const { state } = await submit(() => updateEvent(EVENT_ID, { error: null }, eventForm({ icon_key: "waves" })));

    expect(state?.error).toBe("Not authorised.");
    expect(update).not.toHaveBeenCalled();
  });
});

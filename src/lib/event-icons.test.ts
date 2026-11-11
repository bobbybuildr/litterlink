import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVENT_ICON,
  EVENT_ICON_CATEGORIES,
  EVENT_ICONS,
  getEventIcon,
  getEventIconGroups,
  isEventIconKey,
  parseEventIconKey,
} from "@/lib/event-icons";

describe("EVENT_ICONS", () => {
  it("uses unique, stable lowercase keys", () => {
    const keys = EVENT_ICONS.map((definition) => definition.key);

    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("only references known categories, and every category has icons", () => {
    for (const definition of EVENT_ICONS) {
      expect(EVENT_ICON_CATEGORIES).toHaveProperty(definition.category);
    }
    for (const group of getEventIconGroups()) expect(group.icons.length).toBeGreaterThan(0);
  });
});

describe("getEventIcon", () => {
  it("resolves an allowlisted key to its icon and category colours", () => {
    const resolved = getEventIcon("tree-pine");

    expect(resolved).toMatchObject({ key: "tree-pine", label: "Pine tree" });
    expect(resolved.tileClassName).toBe(EVENT_ICON_CATEGORIES.nature.tileClassName);
  });

  it.each([null, undefined, "", "unknown-icon", "Tree-Pine", "constructor", "__proto__", "toString"])(
    "falls back to the default icon for %j",
    (key) => {
      const resolved = getEventIcon(key);

      expect(resolved.key).toBeNull();
      expect(resolved.icon).toBe(DEFAULT_EVENT_ICON.icon);
    },
  );
});

describe("isEventIconKey", () => {
  it("accepts only exact allowlisted strings", () => {
    expect(isEventIconKey("recycle")).toBe(true);
    expect(isEventIconKey("Recycle")).toBe(false);
    expect(isEventIconKey("recycle ")).toBe(false);
    expect(isEventIconKey(42)).toBe(false);
    expect(isEventIconKey(null)).toBe(false);
  });
});

describe("parseEventIconKey", () => {
  it("treats a missing or empty value as no icon", () => {
    expect(parseEventIconKey(null)).toEqual({ ok: true, key: null });
    expect(parseEventIconKey("")).toEqual({ ok: true, key: null });
  });

  it("accepts an allowlisted key", () => {
    expect(parseEventIconKey("waves")).toEqual({ ok: true, key: "waves" });
  });

  it("rejects anything else, including uploaded files", () => {
    expect(parseEventIconKey("not-an-icon").ok).toBe(false);
    expect(parseEventIconKey(" waves").ok).toBe(false);
    expect(parseEventIconKey(new File(["x"], "waves")).ok).toBe(false);
  });
});

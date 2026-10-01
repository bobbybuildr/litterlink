import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/html";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("leaves ordinary text unchanged", () => {
    expect(escapeHtml("Brighton Beach Clean — 10am")).toBe("Brighton Beach Clean — 10am");
  });

  it("neutralises an unclosed-tag payload", () => {
    const escaped = escapeHtml("<img src=x onerror=alert(1)//");
    expect(escaped).not.toContain("<");
    expect(escaped).toBe("&lt;img src=x onerror=alert(1)//");
  });

  it("escapes attribute breakouts", () => {
    expect(escapeHtml(`" onmouseover="alert(1)`)).toBe("&quot; onmouseover=&quot;alert(1)");
  });

  it("escapes existing entities again rather than trusting them", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });
});

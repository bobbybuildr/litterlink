import { describe, expect, it } from "vitest";
import { escapeHtml, jsonLd } from "@/lib/html";

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

describe("jsonLd", () => {
  it("serialises plain data as JSON", () => {
    expect(jsonLd({ "@type": "Event", name: "Beach Clean — 10am" })).toBe('{"@type":"Event","name":"Beach Clean — 10am"}');
  });

  it("can't close the script element or open a comment", () => {
    const payload = '</script><script>alert(1)</script><!--';
    const serialised = jsonLd({ name: payload });
    expect(serialised).not.toMatch(/[<>&]/);
    expect(serialised).not.toMatch(/<\/script/i);
    expect(serialised).toContain("\\u003c/script\\u003e");
  });

  it("escapes ampersands and the JavaScript line terminators", () => {
    expect(jsonLd("Tom & Jerry\u2028\u2029")).toBe('"Tom \\u0026 Jerry\\u2028\\u2029"');
  });

  it("round-trips to the original values", () => {
    const data = { name: `</script> & <!-- "quoted" 'single' \u2028`, nested: [{ url: "https://example.com/?a=1&b=2" }] };
    expect(JSON.parse(jsonLd(data))).toEqual(data);
  });
});

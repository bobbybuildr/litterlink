import { describe, expect, it } from "vitest";
import { readFormFields, type FieldSpec } from "@/lib/input";

function form(entries: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.append(key, value);
  return fd;
}

function readOne(spec: FieldSpec, value: string | File | undefined) {
  const result = readFormFields(form(value === undefined ? {} : { field: value }), { field: spec });
  return result.ok ? { value: result.values.field } : { error: result.error };
}

const text: FieldSpec = { type: "text", label: "Title", max: 20 };
const multiline: FieldSpec = { type: "multiline", label: "Description", max: 200 };

describe("readFormFields — text", () => {
  it("collapses whitespace runs, including newlines, and trims", () => {
    expect(readOne(text, "  Beach \n\t clean  ")).toEqual({ value: "Beach clean" });
  });

  it("removes control and bidi-override characters", () => {
    expect(readOne(text, "Beach\u0000 \u202Eclean\uFEFF")).toEqual({ value: "Beach clean" });
  });

  it("normalises to NFC", () => {
    expect(readOne(text, "Cafe\u0301")).toEqual({ value: "Caf\u00E9" });
  });

  it("keeps angle brackets as plain text rather than stripping them", () => {
    expect(readOne(text, "kids < 10 > adults")).toEqual({ value: "kids < 10 > adults" });
    expect(readOne(text, "<b>hi</b>")).toEqual({ value: "<b>hi</b>" });
  });

  it("returns null for an empty or missing optional field", () => {
    expect(readOne(text, "   ")).toEqual({ value: null });
    expect(readOne(text, undefined)).toEqual({ value: null });
  });

  it("treats a file upload as empty", () => {
    expect(readOne(text, new File(["x"], "x.txt"))).toEqual({ value: null });
  });

  it("requires a value when required", () => {
    const spec: FieldSpec = { ...text, required: true };
    expect(readOne(spec, "")).toEqual({ error: "Title is required." });
    expect(readOne(spec, " \u202A\uFEFF ")).toEqual({ error: "Title is required." });
  });

  it("enforces max length after normalisation", () => {
    expect(readOne(text, "a".repeat(20))).toEqual({ value: "a".repeat(20) });
    expect(readOne(text, ` ${"a".repeat(20)} `)).toEqual({ value: "a".repeat(20) });
    expect(readOne(text, "a".repeat(21))).toEqual({
      error: "Title must be 20 characters or fewer.",
    });
  });
});

describe("readFormFields — multiline", () => {
  it("keeps single line breaks and normalises CRLF", () => {
    expect(readOne(multiline, "Line one\r\nLine two\rLine three")).toEqual({
      value: "Line one\nLine two\nLine three",
    });
  });

  it("allows at most one blank line", () => {
    expect(readOne(multiline, "Para one\n\n\n\n\nPara two")).toEqual({
      value: "Para one\n\nPara two",
    });
  });

  it("trims trailing spaces on each line and the whole value", () => {
    expect(readOne(multiline, "\n  First   \nSecond\t\n\n")).toEqual({ value: "First\nSecond" });
  });
});

describe("readFormFields — email", () => {
  const email: FieldSpec = { type: "email", label: "Contact email" };

  it.each(["organiser@example.com", "first.last+tag@sub.example.co.uk"])("accepts %s", (value) => {
    expect(readOne(email, value)).toEqual({ value });
  });

  it.each(["not-an-email", "a@b", "a@-example.com", "a b@example.com"])("rejects %s", (value) => {
    expect(readOne(email, value)).toEqual({
      error: "Contact email must be a valid email address.",
    });
  });

  it("caps length at 254", () => {
    expect(readOne(email, `${"a".repeat(250)}@x.co`)).toEqual({
      error: "Contact email must be 254 characters or fewer.",
    });
  });
});

describe("readFormFields — url", () => {
  const url: FieldSpec = { type: "url", label: "Website" };
  const urlError = {
    error: "Website must be a full web address starting with http:// or https://.",
  };

  it.each(["https://litterlink.co.uk", "http://example.com/path?q=1"])("accepts %s", (value) => {
    expect(readOne(url, value)).toEqual({ value });
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com",
    "example.com",
    "HTTPS://example.com",
    "https://",
  ])("rejects %s", (value) => {
    expect(readOne(url, value)).toEqual(urlError);
  });

  it("caps length at 500", () => {
    expect(readOne(url, `https://example.com/${"a".repeat(500)}`)).toEqual({
      error: "Website must be 500 characters or fewer.",
    });
  });
});

describe("readFormFields — postcode", () => {
  const postcode: FieldSpec = { type: "postcode", label: "Postcode", required: true };

  it("upper-cases and tidies whitespace", () => {
    expect(readOne(postcode, "  bn1   1aa ")).toEqual({ value: "BN1 1AA" });
  });

  it("caps length at 10", () => {
    expect(readOne(postcode, "BN1 1AA XYZ")).toEqual({
      error: "Postcode must be 10 characters or fewer.",
    });
  });
});

describe("readFormFields — schema", () => {
  it("reads every declared field", () => {
    const result = readFormFields(form({ name: " Hove Pickers ", bio: "" }), {
      name: { type: "text", label: "Name", max: 50, required: true },
      bio: { type: "multiline", label: "Bio", max: 500 },
    });
    expect(result).toEqual({ ok: true, values: { name: "Hove Pickers", bio: null } });
  });

  it("returns the first error in declaration order", () => {
    const result = readFormFields(form({ email: "bad", name: "" }), {
      name: { type: "text", label: "Name", max: 50, required: true },
      email: { type: "email", label: "Email" },
    });
    expect(result).toEqual({ ok: false, error: "Name is required." });
  });
});

/**
 * Input policy for user-supplied form fields.
 *
 * LitterLink stores plain text and never accepts HTML. Text is kept as typed
 * (so "kids < 10" or "<3" survive) and made safe where it is output: React
 * escapes JSX, raw-HTML sinks such as Leaflet popups use `escapeHtml()` from
 * `@/lib/html`, and emails are sent as plain text. Input is therefore
 * normalised and validated by field type here, never HTML-stripped.
 *
 * Every free-text field a Server Action accepts must be read through
 * `readFormFields()` with a declared type and length cap. Enums, numbers,
 * dates, checkboxes and identifiers (e.g. usernames) are validated against an
 * explicit set, range or pattern in the action. Passwords are passed through
 * untouched.
 */

export type FieldSpec =
  | {
      /** Single line: whitespace runs (including newlines) collapse to one space. */
      type: "text";
      label: string;
      max: number;
      required?: boolean;
    }
  | {
      /** Keeps line breaks; trims trailing spaces per line and caps blank lines at one. */
      type: "multiline";
      label: string;
      max: number;
      required?: boolean;
    }
  | { type: "email" | "url" | "postcode"; label: string; required?: boolean };

type FieldValues<S extends Record<string, FieldSpec>> = {
  [K in keyof S]: S[K] extends { required: true } ? string : string | null;
};

export type ReadFormResult<S extends Record<string, FieldSpec>> =
  | { ok: true; values: FieldValues<S> }
  | { ok: false; error: string };

const DEFAULT_MAX = { email: 254, url: 500, postcode: 10 } as const;

// C0/C1 controls (except tab, LF, CR), bidi overrides/isolates and BOM.
const INVISIBLE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

// The WHATWG pattern browsers use for <input type="email">, so client and server agree.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function normaliseSingleLine(value: string): string {
  return value
    .normalize("NFC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseMultiline(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE_CHARS, "")
    .replace(/[^\S\n]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isHttpUrl(value: string): boolean {
  // Case-sensitive to match the `^https?://` CHECK constraints in the database.
  if (!/^https?:\/\//.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function readField(
  raw: string,
  spec: FieldSpec
): { value: string | null } | { error: string } {
  const value =
    spec.type === "multiline"
      ? normaliseMultiline(raw)
      : spec.type === "postcode"
        ? normaliseSingleLine(raw).toUpperCase()
        : normaliseSingleLine(raw);

  if (!value) {
    return spec.required ? { error: `${spec.label} is required.` } : { value: null };
  }

  const max =
    spec.type === "text" || spec.type === "multiline"
      ? spec.max
      : DEFAULT_MAX[spec.type];
  if (value.length > max) {
    return { error: `${spec.label} must be ${max} characters or fewer.` };
  }

  if (spec.type === "email" && !EMAIL_PATTERN.test(value)) {
    return { error: `${spec.label} must be a valid email address.` };
  }
  if (spec.type === "url" && !isHttpUrl(value)) {
    return {
      error: `${spec.label} must be a full web address starting with http:// or https://.`,
    };
  }

  return { value };
}

/**
 * Reads and validates the declared fields from `formData`, in declaration
 * order. Empty optional fields come back as `null`.
 */
export function readFormFields<const S extends Record<string, FieldSpec>>(
  formData: FormData,
  schema: S
): ReadFormResult<S> {
  const values: Record<string, string | null> = {};

  for (const [name, spec] of Object.entries(schema)) {
    const raw = formData.get(name);
    const result = readField(typeof raw === "string" ? raw : "", spec);
    if ("error" in result) return { ok: false, error: result.error };
    values[name] = result.value;
  }

  return { ok: true, values: values as FieldValues<S> };
}

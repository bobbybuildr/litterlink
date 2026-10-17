const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Encodes text for interpolation into an HTML string. JSX already does this;
 * use it for raw-HTML sinks such as Leaflet popups.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const JSON_SCRIPT_ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * Serialises structured data for `<script type="application/ld+json">`, the one sanctioned
 * `dangerouslySetInnerHTML` sink for user data. Unicode-escaping `<`, `>` and `&` means user text can't close
 * the script (`</script>`) or open a comment (`<!--`), and the JSON still parses to the same values.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (char) => JSON_SCRIPT_ESCAPES[char]);
}

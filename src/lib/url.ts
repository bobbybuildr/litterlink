/** Validates that a URL uses http:// or https://, rejecting schemes like `javascript:`. */
export function validateHttpUrl(value: string | null, label: string): string | null {
  if (value !== null && !/^https?:\/\//.test(value)) {
    return `${label} must start with http:// or https://.`;
  }
  return null;
}

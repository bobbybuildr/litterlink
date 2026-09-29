/** `useActionState` contract: an error plus the submitted fields to re-populate the form. */
export type FormState = {
  error: string | null;
  fields?: Record<string, string>;
};

export function extractFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") fields[key] = value;
  });
  return fields;
}

export function fail(error: string, formData: FormData): FormState {
  return { error, fields: extractFields(formData) };
}

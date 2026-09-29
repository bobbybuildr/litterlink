"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGroup } from "./actions";
import type { FormState } from "@/lib/forms";
import { GroupSubmitButton } from "./GroupSubmitButton";
import { LogoUploadInput } from "./LogoUploadInput";
import { UrlInput } from "@/components/UrlInput";

export function CreateGroupForm() {
  const [state, formAction] = useActionState<FormState, FormData>(createGroup, {
    error: null,
  });

  const f = state.fields;

  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          ref={errorRef}
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <Field label="Group name *" htmlFor="name">
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          defaultValue={f?.name ?? ""}
          placeholder="e.g. Riverside Clean-Up Crew"
          className={inputCls}
        />
      </Field>

      <Field label="Group type *" htmlFor="group_type">
        <select
          id="group_type"
          name="group_type"
          required
          defaultValue={f?.group_type ?? ""}
          className={inputCls}
        >
          <option value="">Select a group type…</option>
          <option value="community">Community</option>
          <option value="school">School</option>
          <option value="corporate">Corporate</option>
          <option value="council">Council</option>
          <option value="charity">Charity</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <Field label="Description" htmlFor="description" hint="Optional">
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={f?.description ?? ""}
          placeholder="What is your group about? Who can join?"
          className={inputCls}
        />
      </Field>

      <Field
        label="Postcode *"
        htmlFor="postcode"
        hint="We use this to show your group on the map and to find nearby events. Please enter a valid UK postcode."
      >
        <input
          id="postcode"
          name="postcode"
          type="text"
          required
          maxLength={10}
          autoComplete="postal-code"
          defaultValue={f?.postcode ?? ""}
          placeholder="e.g. B60 1AA"
          className={inputCls}
        />
      </Field>

      <Field
        label="Display location *"
        htmlFor="location_name"
        hint="How the location appears to visitors"
      >
        <input
          id="location_name"
          name="location_name"
          type="text"
          required
          maxLength={100}
          defaultValue={f?.location_name ?? ""}
          placeholder="e.g. Bromsgrove"
          className={inputCls}
        />
      </Field>

      <LogoUploadInput />

      <Field label="Website URL" htmlFor="website_url" hint="Optional">
        <UrlInput
          id="website_url"
          name="website_url"
          maxLength={500}
          defaultValue={f?.website_url ?? ""}
          placeholder="https://example.com"
          className={inputCls}
        />
      </Field>

      <Field label="Facebook page" htmlFor="social_url" hint="Optional">
        <UrlInput
          id="social_url"
          name="social_url"
          maxLength={500}
          defaultValue={f?.social_url ?? ""}
          placeholder="https://facebook.com/your-group"
          className={inputCls}
        />
      </Field>

      <Field label="Contact email" htmlFor="contact_email" hint="Optional">
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          maxLength={254}
          defaultValue={f?.contact_email ?? ""}
          placeholder="hello@yourgroup.org"
          className={inputCls}
        />
      </Field>

      <div className="flex items-center gap-4 pt-2">
        <GroupSubmitButton />
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {hint && (
          <span className="ml-1 font-normal text-gray-400">({hint})</span>
        )}
      </label>
      {children}
    </div>
  );
}

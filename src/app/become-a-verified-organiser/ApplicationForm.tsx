"use client";

import { useActionState } from "react";
import { submitOrganiserApplication } from "./actions";
import type { FormState } from "@/lib/forms";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export function ApplicationForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    submitOrganiserApplication,
    { error: null }
  );

  const f = state.fields;

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Field
        label="Why do you want to organise litter picks? *"
        htmlFor="motivation"
        hint="Required"
      >
        <textarea
          id="motivation"
          name="motivation"
          rows={4}
          required
          maxLength={2000}
          defaultValue={f?.motivation ?? ""}
          placeholder="Tell us about your motivation and what you hope to achieve…"
          className={inputCls}
        />
      </Field>

      <Field
        label="Previous experience"
        htmlFor="experience"
        hint="Optional"
      >
        <textarea
          id="experience"
          name="experience"
          rows={3}
          maxLength={2000}
          defaultValue={f?.experience ?? ""}
          placeholder="Any relevant volunteering, event organisation, or community experience…"
          className={inputCls}
        />
      </Field>

      <Field
        label="Organisation name"
        htmlFor="organisation_name"
        hint="Optional — leave blank if organising independently"
      >
        <input
          id="organisation_name"
          name="organisation_name"
          type="text"
          maxLength={200}
          defaultValue={f?.organisation_name ?? ""}
          placeholder="e.g. Riverside Clean-Up Crew"
          className={inputCls}
        />
      </Field>

      <Field
        label="Social links"
        htmlFor="social_links"
        hint="Optional — website, Instagram, Facebook, etc."
      >
        <input
          id="social_links"
          name="social_links"
          type="text"
          maxLength={500}
          defaultValue={f?.social_links ?? ""}
          placeholder="https://…"
          className={inputCls}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  return (
    <FormSubmitButton
      pendingText="Submitting…"
      className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
    >
      Submit application
    </FormSubmitButton>
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

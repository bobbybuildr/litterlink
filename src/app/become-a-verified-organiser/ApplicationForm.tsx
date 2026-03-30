import { submitOrganiserApplication } from "./actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

interface ApplicationFormProps {
  error?: string;
}

export function ApplicationForm({ error }: ApplicationFormProps) {
  return (
    <form action={submitOrganiserApplication} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
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
